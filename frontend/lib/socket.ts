import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    const token = localStorage.getItem('worksphere_token');
    const orgId = localStorage.getItem('worksphere_org_id');
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

    socket = io(socketUrl, {
      auth: { token, organizationId: orgId },
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
