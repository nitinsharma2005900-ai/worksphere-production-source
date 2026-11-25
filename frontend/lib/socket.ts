import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocketAuth = () => ({
  token: localStorage.getItem('worksphere_token'),
  organizationId: localStorage.getItem('worksphere_org_id')
});

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const { token, organizationId } = getSocketAuth();
    if (!token || !organizationId) return null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

    socket = io(socketUrl, {
      auth: { token, organizationId },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/** Re-authenticate an existing real-time connection after token rotation. */
export const reconnectSocket = () => {
  if (!socket || typeof window === 'undefined') return;

  const { token, organizationId } = getSocketAuth();
  if (!token || !organizationId) {
    disconnectSocket();
    return;
  }

  socket.auth = { token, organizationId };
  socket.disconnect();
  socket.connect();
};
