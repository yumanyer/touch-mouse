import { sessionManager } from '../sessionManager.instance.js';


/**
 * GET /session/state
 * Estado público de la sesión
 */
function getSessionState(req, res) {
  const session = sessionManager.session;

  if (!session) {
    return res.status(200).json({
      ok: true,
      data: {
        hasSession: false,
        state: 'IDLE',
        code: null,
        startedAt: null,
        endedAt: null
      }
    });
  }

  return res.status(200).json({
    ok: true,
    data: {
      hasSession: true,
      state: session.state,
      code: session.state === 'PAIRING' ? session.pairingCode : null,
      startedAt: session.sessionStartTime,
      endedAt: session.sessionEndTime
    }
  });
}


/**
 * POST /session/start
 * Crea una nueva sesión si no existe
 */
function startSession(req, res) {
  const session = sessionManager.createSession();

  return res.status(201).json({
    ok: true,
    data: {
      sessionId: session.id,
      state: session.state,
      code: session.pairingCode
    }
  });
}
 
/**
 * POST /session/activate
 * Activa la sesión usando el código
 */
function activateSession(req, res) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      ok: false,
      error: 'Falta el código de activación'
    });
  }

  const result = sessionManager.activateSession(code);

  // Si el modelo devuelve string → es error de dominio
  if (typeof result === 'string') {
    return res.status(409).json({
      ok: false,
      error: result
    });
  }

  return res.status(200).json({
    ok: true,
    data: {
      sessionId: result.id,
      state: result.state,
      startSession: result.sessionStartTime,
    }
  });
}

export const SessionController = {
  getSessionState,
  startSession,
  activateSession
};
