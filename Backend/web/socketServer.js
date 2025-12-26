import { WebSocketServer } from 'ws';
import { sessionManager } from '../sessionManager.instance.js'; // <-- cambiá esto


export default function startSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    console.log('🔌 Nuevo cliente conectado', req.socket.remoteAddress);

    ws.on('message', (message) => {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        console.warn('❌ Mensaje inválido');
        return;
      }
  
      // -----------------------------------
      // HELLO: Identificar cliente y sesión
      // -----------------------------------
      if (data.type === 'HELLO') {
        const { role, sessionId, pairingCode } = data;

        if (!role || !sessionId) {
          console.warn('❌ HELLO incompleto');
          return ws.close();
        }

        const session = sessionManager.getSession(sessionId);

        if (!session) {
          console.warn('❌ Sesión inexistente');
          return ws.close();
        }

        // Validar código de emparejamiento si es móvil
// Validar código de emparejamiento solo si es móvil y viene el código
if (role === 'mobile' && pairingCode && session.pairingCode !== pairingCode) {
  console.warn('❌ Código de emparejamiento incorrecto');
  return ws.close();
}

        if (role === 'pc') session.pcSocket = ws;
        if (role === 'mobile') session.mobileSocket = ws;

        ws.sessionId = sessionId;
        ws.role = role;

        console.log(`✅ Cliente identificado como: ${role} en sesión ${sessionId}`);
        return;
      }

      // -----------------------------------
      // SIGNAL: WebRTC offer/answer/candidate
      // -----------------------------------
      if (data.type === 'signal') {
        const session = sessionManager.getSession(ws.sessionId);
        if (!session) return;

        let targetSocket = null;
        if (ws.role === 'pc' && session.mobileSocket) targetSocket = session.mobileSocket;
        if (ws.role === 'mobile' && session.pcSocket) targetSocket = session.pcSocket;

        if (targetSocket && targetSocket.readyState === targetSocket.OPEN) {
          targetSocket.send(JSON.stringify(data));
        }
        return;
      }

      // -----------------------------------
      // CONTROL: eventos del móvil al PC
      // -----------------------------------
      if (data.type === 'control' && ws.role === 'mobile') {
        const session = sessionManager.getSession(ws.sessionId);
        if (!session || !session.pcSocket) return;

        if (session.pcSocket.readyState === session.pcSocket.OPEN) {
          session.pcSocket.send(JSON.stringify(data));
        }
        return;
      }
    });

    ws.on('close', () => {
      console.log('❌ Cliente desconectado', ws.role);

      if (ws.sessionId && ws.role) {
        const session = sessionManager.getSession(ws.sessionId);
        if (!session) return;

        if (ws.role === 'pc') session.pcSocket = null;
        if (ws.role === 'mobile') session.mobileSocket = null;
      }
    });
  });
}
