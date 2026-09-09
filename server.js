import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 10000,
  pingInterval: 5000
});

let currentTimerState = {
  configuredSeconds: 24 * 3600,
  targetTime: null,
  isTimerRunning: false,
  bombStage: 0,
  githubRepoUrl: 'https://github.com/balajik1910',
  showQrCode: false,
  lastUpdated: Date.now()
};

let connectedClients = 0;

io.on('connection', (socket) => {
  connectedClients++;
  console.log(`[REALTIME SYNC] Laptop Client Connected (${socket.id}). Total Online Laptops: ${connectedClients}`);

  // Send current state to newly connected client immediately
  socket.emit('timer:sync', currentTimerState);
  // Broadcast updated peer count to all connected laptops
  io.emit('peers:count', { count: connectedClients });

  // Handle timer update from any laptop
  socket.on('timer:update', (newState) => {
    if (newState && typeof newState === 'object') {
      currentTimerState = {
        ...currentTimerState,
        ...newState,
        lastUpdated: Date.now()
      };
      // Broadcast state to all connected laptops instantly
      io.emit('timer:sync', currentTimerState);
    }
  });

  socket.on('disconnect', () => {
    connectedClients = Math.max(0, connectedClients - 1);
    console.log(`[REALTIME SYNC] Laptop Client Disconnected (${socket.id}). Remaining Online Laptops: ${connectedClients}`);
    io.emit('peers:count', { count: connectedClients });
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedLaptops: connectedClients,
    timerState: currentTimerState
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` MEGATHON REALTIME MULTI-LAPTOP SYNC SERVER ACTIVE!`);
  console.log(` Listening on port: ${PORT} (0.0.0.0)`);
  console.log(` Ready to sync 5+ laptops on local network / venue Wi-Fi!`);
  console.log(`=======================================================`);
});
