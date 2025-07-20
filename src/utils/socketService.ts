import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emitLogin(userData: any) {
    if (this.socket) {
      this.socket.emit('user_login', userData);
    }
  }

  emitLogout(userData: any) {
    if (this.socket) {
      this.socket.emit('user_logout', userData);
    }
  }

  onUserActivity(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_activity', callback);
    }
  }

  removeUserActivityListener() {
    if (this.socket) {
      this.socket.off('user_activity');
    }
  }
}

export default new SocketService(); 