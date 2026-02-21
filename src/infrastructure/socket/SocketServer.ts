import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { TokenServiceImpl } from '../../modules/auth/infrastructure/jwt/TokenServiceImpl';
import { socketEventEmitter } from './SocketEventEmitter';

/**
 * createSocketServer
 *
 * Attaches a Socket.io server to the existing HTTP server.
 * The same port (4000) now handles both:
 *   - HTTP REST requests (unchanged)
 *   - WebSocket connections (new)
 *
 * Auth: JWT token is verified on every connection via socket.handshake.auth.token.
 * Rooms: each workspace gets a room named `workspace:{workspaceId}`.
 *        Clients join by emitting 'join-workspace' with the workspaceId.
 */
export function createSocketServer(httpServer: HttpServer): SocketIOServer {
    const tokenService = new TokenServiceImpl();

    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            credentials: true,
        },
    });

    // Authentication middleware — run on every new connection
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token as string | undefined;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = tokenService.verifyToken(token);
            socket.data.userId = decoded.userId;
            next();
        } catch {
            next(new Error('Invalid or expired token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        // Client emits 'join-workspace' with the workspaceId to start receiving events
        socket.on('join-workspace', (workspaceId: string) => {
            if (typeof workspaceId === 'string' && workspaceId.length > 0) {
                socket.join(`workspace:${workspaceId}`);
            }
        });

        // Client emits 'leave-workspace' when navigating away
        socket.on('leave-workspace', (workspaceId: string) => {
            if (typeof workspaceId === 'string') {
                socket.leave(`workspace:${workspaceId}`);
            }
        });
    });

    // Give the singleton emitter a reference to the io instance
    socketEventEmitter.init(io);

    return io;
}
