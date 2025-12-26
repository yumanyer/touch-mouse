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
      console.log("🔄 Signal type:", msg.signal.type);
      
      if (msg.signal.type === "answer") {
        console.log("📥 Recibiendo answer del móvil");
        pc.setRemoteDescription(msg.signal);
      } else if (msg.signal.type === "candidate") {
        console.log("📥 Recibiendo candidate");
        pc.addIceCandidate(msg.signal).catch(console.error);
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
      ws.send(JSON.stringify({ type: "signal", signal: event.candidate }));
    }
  };
}

// ────────────── Control remoto ──────────────
function handleControlEvent(event) {
  if (event.type === "mouseMove") {
    console.log("Mouse move:", event.x, event.y);
  } else if (event.type === "click") {
    console.log("Click:", event.button);
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