import { Router } from 'express';
import { SessionController } from '../controllers/Session.controller.js';
const routerSession = Router();

routerSession.get("/state", SessionController.getSessionState);
routerSession.post("/start", SessionController.startSession);
routerSession.post("/activate", SessionController.activateSession);

export default routerSession;
 