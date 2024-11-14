import express from 'express';
import { Server as HTTPServer } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

type Status = 'error' | 'pending' | 'completed';

export function createServer() {
  const app = express();
  app.use(cors());

  let status: Status = 'pending';
  const delay = parseInt(process.env.DELAY || '5000', 10);

  const simulateError = () => {
    if (process.env.SIMULATE_ERROR === 'true') {
      return true;
    } else {
      return false;
    }
  };

  app.get('/status', (req, res) => {
    res.json({ result: status });
  });

  const server = new HTTPServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ result: status }));
  });

  const broadcastStatus = () => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ result: status }));
      }
    });
  };

  setTimeout(() => {
    if (simulateError()) {
      status = 'error';
    } else {
      status = 'completed';
    }

    broadcastStatus();
  }, delay);

  server.on('error', (err) => {
    console.error(`Server encountered an error: ${err}`);
    status = 'error';
    broadcastStatus();
  });

  wss.on('error', (err) => {
    console.error(`WebSocket encountered an error: ${err}`);
    status = 'error';
    broadcastStatus();
  });

  return server;
}