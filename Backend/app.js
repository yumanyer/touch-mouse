import express from 'express';
import http from 'http';
import getDirname from './dirname.js';
import path from 'path';
import os from 'os';


import startSocketServer from './web/socketServer.js';
import routerSession from './router/session.route.js';

const app = express();
const server = http.createServer(app);
startSocketServer(server);
const publicPath = path.join(getDirname(), '../Backend/Frontend');
app.use(express.static(publicPath));


app.use(express.json());



const port = 3000;

app.get("/",(req,res)=>{res.sendFile(path.join(publicPath,"index.html"))})
app.get("/client",(req,res)=>{res.sendFile(path.join(publicPath,"client.html"))})

app.use("/session" ,routerSession)

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(port, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`🚀 Servidor iniciado!`);
  console.log(`💻 Local: http://localhost:${port}`);
  console.log(`📱 Móvil: http://${localIP}:${port}/client`);

});