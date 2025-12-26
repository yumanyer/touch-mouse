import { v4 as uuidv4 } from 'uuid';
import { generateCode } from '../utils/generatedCode.js';
const SessionState = {
  IDLE: 'IDLE', // INACTIVE
  PAIRING: 'PAIRING', //EMPAREJANDO
  ACTIVE: 'ACTIVE',//ACTIVO
  TERMINATING: 'TERMINATING', // TERMINANDO
  TERMINATED: 'TERMINATED',//TERMINADO 
};

const hoy = new Date();
const fechaFormateada = hoy.getDate() + '/' + (hoy.getMonth() + 1) + '/' + hoy.getFullYear();

//👉 SessionManager NO tiene constructor con datos de sesión
//👉 SessionManager administra sesiones, no ES una sesión
export class SessionManager {
  constructor() {
    this.session = null;
  }

  getSession(sessionId) {  // <-- AGREGÁ ESTE MÉTODO
    if (this.session && this.session.id === sessionId) {
      return this.session;
    }
    return null;
  }

  getSessionState() {
    console.log("this.session",this.session);
    return this.session ? this.session.state : SessionState.IDLE;
  }

  activateSession(code) {
    if(!this.session) return "No existe una sesión activa";
    if(this.session.state !== SessionState.PAIRING) return "La sesión no está en estado de emparejamiento";
    if(this.session.pairingCode !== code) return "El código de emparejamiento no es correcto";
    this.session.state = SessionState.ACTIVE;
    this.session.sessionStartTime = fechaFormateada;
    this.session.lastControlHeartbeat = fechaFormateada;
    console.log(`Sesión ${this.session.id} activada`);
    
    return this.session;
  }

  createSession() {
    if(!this.session) {
        this.session = {
            id: uuidv4(),
            state: SessionState.PAIRING,
            sessionStartTime:null,
            sessionEndTime:null,
            endReason:null,
            lastControlHeartbeat:null,
            pairingCode:generateCode(),
        }
    }
    return this.session;
  }
}
