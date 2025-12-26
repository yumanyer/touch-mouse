import express from 'express';
import http from 'http';
import getDirname from './dirname.js';
import path from 'path';


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
server.listen(port, () => {
  console.log(`Servidor corriendo  http://localhost:${port}`);
});