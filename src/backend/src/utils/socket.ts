import { Server } from 'socket.io';

let io: Server | null = null;

export function setIO(server: Server) {
  io = server;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO instance not set');
  return io;
} 