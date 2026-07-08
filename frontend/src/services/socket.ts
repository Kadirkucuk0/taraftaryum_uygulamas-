import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

// Use your local IP for mobile (Expo Go), and location hostname for web
const getSocketUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://192.168.1.103:5000';
};
const SOCKET_URL = getSocketUrl();

class SocketService {
  public socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;
