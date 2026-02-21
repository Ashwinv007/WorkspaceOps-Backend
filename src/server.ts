import http from 'http';
import app from './app';
import { connectDB } from './config/database';
import { env } from './config/env';
import { createSocketServer } from './infrastructure/socket/SocketServer';

const startServer = async () => {
  await connectDB();

  // Wrap Express in a raw HTTP server so Socket.io can share the same port
  const httpServer = http.createServer(app);

  // Attach Socket.io — same port handles both REST (HTTP) and real-time (WebSocket)
  createSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    console.log(`Socket.io enabled — ws://localhost:${env.port}`);
  });
};

startServer();
