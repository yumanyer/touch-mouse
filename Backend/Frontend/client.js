const API_BASE = "http://192.168.0.10:3000/session";
const WS_BASE = "ws://192.168.0.10:3000";

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
  
  // Ocultar el formulario
  document.querySelector('.form-client').style.display = 'none';
  
  ws = new WebSocket(WS_BASE);

  ws.onopen = () => {
    console.log("📱 WS Mobile conectado");
    console.log("SessionId:", sessionId);
    console.log("PairingCode:", pairingCode);
    ws.send(JSON.stringify({
      type: "HELLO",
      role: "mobile",
      sessionId,
      pairingCode
    }));
    createPeerConnection();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("📩 Mensaje recibido:", msg.type);

    if (msg.type === "signal") {
      console.log("🔄 Signal type:", msg.signal.type);
      
      if (msg.signal.type === "offer") {
        console.log("📥 Recibiendo offer, creando answer");
        pcConnection.setRemoteDescription(msg.signal).then(() => {
          return pcConnection.createAnswer();
        }).then(answer => {
          return pcConnection.setLocalDescription(answer);
        }).then(() => {
          console.log("📤 Enviando answer a PC");
          ws.send(JSON.stringify({ type: "signal", signal: pcConnection.localDescription }));
        }).catch(err => {
          console.error("❌ Error en answer:", err);
        });
      } else if (msg.signal.type === "candidate") {
        console.log("📥 Recibiendo candidate");
        pcConnection.addIceCandidate(msg.signal).catch(console.error);
      } else if (msg.signal.type === "answer") {
        console.log("📥 Recibiendo answer (no debería pasar en mobile)");
        pcConnection.setRemoteDescription(msg.signal);
      }
    }
  };
}

function createPeerConnection() {
pcConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});
pcConnection.ontrack = (event) => {
  console.log("🎥 Track recibido!", event);
  const videoEl = document.getElementById("screen");
  if (!videoEl.srcObject) {
    videoEl.srcObject = event.streams[0];
    videoEl.style.display = 'block';
    console.log("✅ Video asignado");
    
    // Esperar a que haya datos antes de reproducir
    videoEl.onloadedmetadata = () => {
      console.log("📊 Metadata cargada");
      videoEl.play().then(() => {
        console.log("▶️ Video reproduciéndose");
      }).catch(err => {
        console.error("❌ Error reproduciendo video:", err);
      });
    };
  }
};

  pcConnection.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === ws.OPEN) {
      console.log("📤 Enviando candidate");
      ws.send(JSON.stringify({ type: "signal", signal: event.candidate }));
    }
  };
}

// ────────────── Control remoto ──────────────
function sendControlEvent(event) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: "control", event }));
  }
}

// ────────────── Init ──────────────
export function startViewer() {
  const verifyBtn = document.querySelector(".validate-client");
  verifyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const code = getCodeFromInputs();
    if (code.length !== 6) return showError("Código incompleto");
    activateSession(code);
  });

  const touchArea = document.querySelector(".inputs-client");
  touchArea.addEventListener("mousemove", e => {
    sendControlEvent({ type: "mouseMove", x: e.offsetX, y: e.offsetY });
  });
  touchArea.addEventListener("click", e => {
    sendControlEvent({ type: "click", button: 0 });
  });
}