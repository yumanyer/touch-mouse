const API_BASE = `${window.location.origin}/session`;
const codeElements = document.getElementsByClassName("code-digit");

let pollingInterval = null;
let currentState = null;
let previousState = null;
let pairingCode = null;

// WebRTC
let pc = null;
let dataChannel = null;
let ws = null;
let sessionId = null;

// ────────────── Inicio ──────────────
async function startSession() {
  const res = await fetch(`${API_BASE}/start`, { method: "POST" });
  const json = await res.json();
  console.log("Respuesta /start:", json);

  if (!json.ok) return console.error("Error iniciando sesión");

  pairingCode = json.data.code;
  sessionId = json.data.sessionId || json.data.id;
  console.log("Código generado:", pairingCode);
  console.log("SessionId guardado:", sessionId);

  for (let i = 0; i < codeElements.length; i++) {
    codeElements[i].innerText = pairingCode[i];
  }

  startPolling();
}

// ────────────── Polling ──────────────
function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(pollSessionState, 1500);
}

function stopPolling() {
  if (!pollingInterval) return;
  clearInterval(pollingInterval);
  pollingInterval = null;
}

// ────────────── Estado ──────────────
async function pollSessionState() {
  const res = await fetch(`${API_BASE}/state`);
  const json = await res.json();
  if (!json.ok) return;

  const data = json.data;
  previousState = currentState;
  currentState = data.state;

  if (previousState !== currentState) {
    console.log(`Estado cambió: ${previousState} → ${currentState}`);
    handleStateTransition(previousState, currentState, data);
  }
}

// ────────────── Transiciones ──────────────
function handleStateTransition(from, to, data) {
  switch (to) {
    case "PAIRING":
      console.log("🟡 Esperando conexión del celular");
      break;
    case "ACTIVE":
      console.log("🟢 Celular conectado");
      stopPolling();
      setupWebSocket();
      break;
    case "TERMINATED":
      console.log("🔴 Sesión terminada");
      stopPolling();
      resetLocalState();
      break;
  }
}

// ────────────── WS + WebRTC ──────────────
function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log("🧠 WS PC conectado");
    console.log("SessionId:", sessionId);
    console.log("PairingCode:", pairingCode);
    ws.send(JSON.stringify({
      type: "HELLO",
      role: "pc",
      sessionId,
      pairingCode
    }));
    createPeerConnection();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log("📩 PC recibió:", msg.type);

    // WebRTC signaling
    if (msg.type === "signal") {
      const signalType = msg.signal.type || (msg.signal.candidate ? "candidate" : "unknown");
      console.log("🔄 Signal type:", signalType);
      
      if (signalType === "answer") {
        console.log("📥 Recibiendo answer del móvil");
        pc.setRemoteDescription(new RTCSessionDescription(msg.signal));
      } else if (signalType === "candidate") {
        console.log("📥 Recibiendo candidate");
        pc.addIceCandidate(new RTCIceCandidate(msg.signal)).catch(console.error);
      }
    }

    // Control events del móvil
    if (msg.type === "control") {
      handleControlEvent(msg.event);
    }
  };

  ws.onclose = () => console.log("❌ WS PC cerrado");
}

function createPeerConnection() {
pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
})
  // Data channel
  dataChannel = pc.createDataChannel("control");
  dataChannel.onmessage = (e) => handleControlEvent(JSON.parse(e.data));

  // Screen capture mejorada
  navigator.mediaDevices.getDisplayMedia({ 
    video: {
      displaySurface: "monitor",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 }
    },
    audio: false
  }).then(stream => {
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    console.log("✅ Pantalla compartida");
    
    // Crear y enviar offer
    return pc.createOffer();
  }).then(offer => {
    console.log("📤 Creando offer");
    return pc.setLocalDescription(offer);
  }).then(() => {
    console.log("📤 Enviando offer al móvil");
    ws.send(JSON.stringify({ type: "signal", signal: pc.localDescription }));
  }).catch(err => {
    console.error("❌ Error en WebRTC:", err);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("📤 Enviando candidate");
      // Asegurarse de que el candidato tenga la estructura correcta
      ws.send(JSON.stringify({ type: "signal", signal: event.candidate }));
    }
  };
  
  pc.onconnectionstatechange = () => {
    console.log("🌐 WebRTC Connection State:", pc.connectionState);
  };
  
  pc.oniceconnectionstatechange = () => {
    console.log("🧊 ICE Connection State:", pc.i// ────────────── Control remoto ──────────────
let joystickInterval = null;
let currentDX = 0;
let currentDY = 0;
const SENSITIVITY = 15; // Aumentado para mejor respuesta

function handleControlEvent(event) {
  console.log("Procesando evento de control:", event.type);
  
  if (event.type === "mouseMove") {
    // Para el movimiento directo del touchpad
    console.log(`[OS] Moviendo ratón a: ${event.x}, ${event.y}`);
    // window.postMessage({ type: 'OS_MOUSE_MOVE', x: event.x, y: event.y }, '*');
  } 
  else if (event.type === "click") {
    console.log("[OS] Ejecutando CLICK izquierdo");
    // Simulación de click en el sistema
    // window.postMessage({ type: 'OS_MOUSE_CLICK', button: 'left' }, '*');
  } 
  else if (event.type === "joystickMove") {
    currentDX = event.dx;
    currentDY = event.dy;
    
    if (currentDX !== 0 || currentDY !== 0) {
      if (!joystickInterval) {
        joystickInterval = setInterval(() => {
          const moveX = Math.round(currentDX * SENSITIVITY);
          const moveY = Math.round(currentDY * SENSITIVITY);
          
          console.log(`[OS] Moviendo cursor relativo: dx=${moveX}, dy=${moveY}`);
          
          // En una app de escritorio real (Electron/Node), aquí llamaríamos a robotjs:
          // robot.moveMouseRelative(moveX, moveY);
          
          // Para esta demo web, podríamos emitir un evento que una extensión o app local escuche
          window.postMessage({ type: 'OS_MOUSE_MOVE_RELATIVE', dx: moveX, dy: moveY }, '*');
        }, 16); // ~60fps para suavidad
      }
    } else {
      if (joystickInterval) {
        clearInterval(joystickInterval);
        joystickInterval = null;
        console.log("[OS] Movimiento detenido");
      }
    }
  }
}

// ────────────── Reset ──────────────
function resetLocalState() {
  currentState = null;
  previousState = null;
  pairingCode = null;
  ws = null;
  pc = null;
  dataChannel = null;
}

// ────────────── Init ──────────────
startSession();