const API_BASE = `${window.location.origin}/session`;
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_BASE = `${protocol}//${window.location.host}`;

let pollingInterval = null;
let currentState = null;
let ws = null;
let pcConnection = null;
let sessionId = null;
let pairingCode = null;
 
// ────────────── Helpers ──────────────
function getCodeFromInputs() {
  const inputs = document.querySelectorAll(".inputs-client input");
  return Array.from(inputs).map(i => i.value).join("");
}

function showError(msg) {
  alert(msg);
}

// ────────────── Activar sesión ──────────────
async function activateSession(code) {
  try {
    const res = await fetch(`${API_BASE}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    console.log("Respuesta /activate:", json);
    if (!json.ok) {
      showError(json.error);
      return;
    }
    pairingCode = code;
    sessionId = json.data.sessionId || json.data.id;
    console.log("SessionId guardado:", sessionId);
    startPolling();
  } catch (err) {
    console.error("Error activando sesión:", err);
  }
}

// ────────────── Polling ──────────────
function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(checkSessionState, 1200);
}

function stopPolling() {
  clearInterval(pollingInterval);
  pollingInterval = null;
}

async function checkSessionState() {
  try {
    const res = await fetch(`${API_BASE}/state`);
    const json = await res.json();
    if (!json.ok) return;

    const state = json.data.state;
    if (state !== currentState) {
      console.log("Estado:", state);
      currentState = state;
    }

    if (state === "ACTIVE") onSessionActive(json.data);
  } catch (err) {
    console.error(err);
  }
}

// ────────────── WS + WebRTC ──────────────
function onSessionActive(data) {
  stopPolling();
  
  // Ocultar el formulario y mostrar UI de control
  document.querySelector('.form-client').style.display = 'none';
  const controlUI = document.getElementById("control-ui");
  if (controlUI) controlUI.style.display = 'flex';
  
  ws = new WebSocket(WS_BASE);

  ws.onopen = () => {
    console.log("📱 WS Mobile conectado");
    ws.send(JSON.stringify({
      type: "HELLO",
      role: "mobile",
      sessionId,
      pairingCode
    }));
    createPeerConnection();
    initJoystick();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "signal") {
      const signalType = msg.signal.type || (msg.signal.candidate ? "candidate" : "unknown");
      if (signalType === "offer") {
        pcConnection.setRemoteDescription(new RTCSessionDescription(msg.signal)).then(() => {
          return pcConnection.createAnswer();
        }).then(answer => {
          return pcConnection.setLocalDescription(answer);
        }).then(() => {
          ws.send(JSON.stringify({ type: "signal", signal: pcConnection.localDescription }));
        }).catch(err => console.error("❌ Error en answer:", err));
      } else if (signalType === "candidate") {
        pcConnection.addIceCandidate(new RTCIceCandidate(msg.signal)).catch(console.error);
      }
    }
  };
}

function createPeerConnection() {
  pcConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  pcConnection.ontrack = (event) => {
    const videoEl = document.getElementById("screen");
    if (!videoEl.srcObject) {
      videoEl.srcObject = event.streams[0];
      videoEl.style.display = 'block';
      videoEl.onloadedmetadata = () => videoEl.play().catch(console.error);
    }
  };

  pcConnection.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "signal", signal: event.candidate }));
    }
  };
}

// ────────────── Control Remoto (Joystick + Botón) ──────────────
function initJoystick() {
  const joystick = document.getElementById("joystick");
  const stick = document.getElementById("stick");
  const clickBtn = document.getElementById("clickBtn");

  if (!joystick || !stick) return;

  let dragging = false;
  let center = { x: 0, y: 0 };
  const maxDistance = 60;

  function handleStart(e) {
    const rect = joystick.getBoundingClientRect();
    center.x = rect.left + rect.width / 2;
    center.y = rect.top + rect.height / 2;
    dragging = true;
    handleMove(e);
  }

  function handleMove(e) {
    if (!dragging || !ws || ws.readyState !== ws.OPEN) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    let dx = touch.clientX - center.x;
    let dy = touch.clientY - center.y;

    const dist = Math.hypot(dx, dy);
    if (dist > maxDistance) {
      dx = (dx / dist) * maxDistance;
      dy = (dy / dist) * maxDistance;
    }

    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    // Enviar dx/dy normalizados para el movimiento continuo en la PC
    ws.send(JSON.stringify({
      type: "control",
      event: {
        type: "joystickMove",
        dx: dx / maxDistance,
        dy: dy / maxDistance
      }
    }));
  }

  function handleEnd() {
    dragging = false;
    stick.style.transform = "translate(-50%, -50%)";
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: "control",
        event: { type: "joystickMove", dx: 0, dy: 0 }
      }));
    }
  }

  joystick.addEventListener("touchstart", handleStart);
  window.addEventListener("touchmove", handleMove, { passive: false });
  window.addEventListener("touchend", handleEnd);

  // Soporte para mouse (testing)
  joystick.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);

  // Botón de Click
  if (clickBtn) {
    clickBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: "control",
          event: { type: "click", button: 0 }
        }));
      }
    });
    // Soporte mouse
    clickBtn.addEventListener("mousedown", () => {
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: "control",
          event: { type: "click", button: 0 }
        }));
      }
    });
  }
}

// ────────────── Init ──────────────
export function startViewer() {
  const verifyBtn = document.querySelector(".validate-client");
  if (verifyBtn) {
    verifyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const code = getCodeFromInputs();
      if (code.length !== 6) return showError("Código incompleto");
      activateSession(code);
    });
  }
}
