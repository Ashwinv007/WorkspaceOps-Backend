import { Server as SocketIOServer } from 'socket.io';

/**
 * SocketEventEmitter — Singleton
 *
 * Decouples business logic from Socket.io internals.
 * Any module that needs to broadcast real-time events calls emit() here
 * without importing socket.io directly.
 *
 * Initialised once in server.ts via init(io).
 * Safe to call before init — no-op if io is not yet set.
 */
class SocketEventEmitter {
    private io: SocketIOServer | null = null;

    init(io: SocketIOServer): void {
        this.io = io;
    }

    emit(workspaceId: string, event: string, payload: object): void {
        if (!this.io) return; // no-op during startup or tests
        this.io.to(`workspace:${workspaceId}`).emit(event, payload);
    }
}

// Export a single shared instance used by the whole application
export const socketEventEmitter = new SocketEventEmitter();
