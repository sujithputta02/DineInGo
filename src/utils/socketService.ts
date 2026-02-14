import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;

  connect() {
    // Return existing socket if already connected
    if (this.socket?.connected) {
      return this.socket;
    }

    // Don't attempt connection if we've exceeded max attempts
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('Socket.IO: Max connection attempts reached. Backend may not be running.');
      return this.socket;
    }

    // Return existing socket if currently connecting
    if (this.isConnecting) {
      return this.socket!;
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      transports: ['polling', 'websocket'], // Start with polling to avoid WebSocket errors
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 5000,
      autoConnect: true,
      forceNew: false,
      upgrade: true,
    });

    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('✓ Socket.IO connected successfully');
        this.isConnecting = false;
        this.connectionAttempts = 0; // Reset on successful connection
      });

      this.socket.on('connect_error', (error) => {
        this.isConnecting = false;
        // Only log if it's the first few attempts
        if (this.connectionAttempts <= 2) {
          console.log('Socket.IO: Backend server not available (this is normal if server is not running)');
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('✓ Socket.IO reconnected');
        this.connectionAttempts = 0;
      });

      this.socket.on('reconnect_error', () => {
        // Silently handle reconnection errors
      });

      this.socket.on('reconnect_failed', () => {
        this.isConnecting = false;
        console.log('Socket.IO: Unable to connect to backend server');
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.connectionAttempts = 0;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocket() {
    return this.socket;
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

  joinRestaurant(restaurantId: string) {
    if (this.socket) {
      this.socket.emit('joinRestaurant', restaurantId);
    }
  }

  leaveRestaurant(restaurantId: string) {
    if (this.socket) {
      this.socket.emit('leaveRestaurant', restaurantId);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new SocketService(); 