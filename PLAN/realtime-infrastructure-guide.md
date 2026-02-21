# Real-Time Infrastructure — Complete Beginner Guide

> **Audience:** Someone new to WebSockets and real-time tech. No prior knowledge assumed.
> **Goal:** Understand how real-time works, how Socket.io fits into this Express.js project, and what changes the frontend (Next.js) needs.

---

## Table of Contents
1. [The Problem: Why REST isn't Enough for Real-Time](#1-the-problem)
2. [Three Solutions: Polling, SSE, WebSockets](#2-three-solutions)
3. [What is Socket.io?](#3-what-is-socketio)
4. [Key Concepts: Rooms, Events, Auth](#4-key-concepts)
5. [How Socket.io Attaches to Your Express Server](#5-how-it-attaches-to-express)
6. [The Event Flow: End-to-End](#6-the-event-flow-end-to-end)
7. [Backend Implementation in This Project](#7-backend-implementation)
8. [Frontend Implementation (Next.js)](#8-frontend-implementation-nextjs)
9. [What Happens at Every Layer — Summary Diagram](#9-summary-diagram)

---

## 1. The Problem

**Normal HTTP works like a phone call you always hang up:**

```
User A (browser) ──── GET /work-items ────► Server
                  ◄─── response + disconnect ──

[10 seconds later]

User B changes work item status

User A ──── GET /work-items ────► Server      ← User A has to ask again
        ◄─── (updated data) ──────
```

User A only sees the change if they refresh or poll repeatedly. In a collaborative workspace, this is a bad experience — changes appear stale.

---

## 2. Three Solutions

### Option A: Polling (What you have now)
The client asks the server every N seconds: "anything new?"
```
Client → GET /work-items every 5 seconds
```
**Pros:** Simple, no infrastructure changes
**Cons:** Wasteful (99% of requests return "no change"), adds load, feels delayed

### Option B: Server-Sent Events (SSE)
The client opens a long-lived HTTP connection and the server pushes events down it — one direction only (server → client).
```
Client → GET /events (keeps connection open)
                     ← Server pushes event when something changes
```
**Pros:** Simple, built into browsers
**Cons:** One-way only (server to client), tricky with load balancers

### Option C: WebSockets ← **What we implement**
Both sides can send messages at any time over a persistent connection.
```
Client ←──────────────────── Server
       ──────────────────────►
       (connection stays open, both sides can push)
```
**Pros:** Truly bidirectional, low latency, widely supported
**Cons:** Slightly more complex setup, but Socket.io handles the complexity for you

---

## 3. What is Socket.io?

Socket.io is a library built on top of WebSockets. It adds four things that raw WebSockets don't have:

### 3a. Named Events
Instead of raw binary frames, you send and receive named events:
```typescript
// Server sends:
socket.emit('work-item:status-changed', { id: '...', status: 'ACTIVE' });

// Client listens:
socket.on('work-item:status-changed', (data) => {
  console.log('Status changed:', data.status);
});
```

### 3b. Rooms
A room is a named channel. You can join a room and broadcast to all members of that room.
```typescript
// Server: join a room
socket.join('workspace:abc123');

// Server: broadcast to everyone in the room
io.to('workspace:abc123').emit('work-item:status-changed', payload);
```
In this project: each workspace is a room. When you open a workspace, your browser joins that workspace's room. When anyone in that workspace changes something, the server broadcasts to the entire room.

### 3c. Automatic Reconnection
If the connection drops (network hiccup, server restart), Socket.io automatically reconnects — you don't have to handle this yourself.

### 3d. Fallback
If WebSockets are blocked (some corporate firewalls), Socket.io falls back to HTTP long-polling transparently.

---

## 4. Key Concepts in This Project

### Rooms: `workspace:{workspaceId}`
Every workspace gets its own room. When a user opens a workspace page, the frontend connects to the socket server and joins that workspace's room.

```
workspace:abc123  ← User A, User B, User C are all in this room
workspace:xyz789  ← completely separate room, User D is here
```

### Authentication
When a user connects via WebSocket, they pass their JWT token in the connection handshake:
```typescript
// Frontend sends:
const socket = io('http://localhost:4000', {
  auth: { token: localStorage.getItem('workspaceops_token') }
});

// Server verifies on connect:
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = tokenService.verifyToken(token);  // same JWT verification
  socket.data.userId = decoded.userId;
  next();
});
```

### Events in This Project
Only 8 events are emitted (scoped to critical real-time needs):

| Event Name | Triggered When |
|------------|----------------|
| `work-item:status-changed` | Work item status transitions (DRAFT↔ACTIVE↔COMPLETED) |
| `work-item:document-linked` | Document linked to work item |
| `work-item:document-unlinked` | Document unlinked from work item |
| `document:uploaded` | New document uploaded |
| `document:deleted` | Document deleted |
| `workspace:member-invited` | New member invited |
| `workspace:member-updated` | Member role changed |
| `workspace:member-removed` | Member removed |

---

## 5. How Socket.io Attaches to Your Express Server

Currently your `server.ts` uses `app.listen()` which creates an HTTP server internally. For Socket.io, you need to create the HTTP server explicitly and attach Socket.io to it:

```typescript
// BEFORE (current server.ts):
app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

// AFTER (with Socket.io):
import http from 'http';
import { createSocketServer } from './infrastructure/socket/SocketServer';

const httpServer = http.createServer(app);   // ← wrap Express in raw HTTP server
createSocketServer(httpServer);               // ← attach Socket.io to same server
httpServer.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
```

**Key insight:** Your REST API still works exactly the same. The same port (4000) now handles both:
- `http://localhost:4000/...` — REST requests (unchanged)
- `ws://localhost:4000` — WebSocket connections (new)

---

## 6. The Event Flow: End-to-End

Here's exactly what happens when User A changes a work item status and User B sees it:

```
USER A (browser)                 BACKEND                        USER B (browser)

1. PATCH /work-items/:id/status ──────────────────────►
   { status: 'ACTIVE' }          2. Validates transition
                                  3. Updates DB (atomic)
                                  4. AuditLogService.log()
                                     ├─ writes to MongoDB
                                     └─ SocketEventEmitter.emit(
                                          workspaceId,
                                          'work-item:status-changed',
                                          { id, status: 'ACTIVE' }
                                        )
                                  5. io.to('workspace:abc123')
                                     .emit('work-item:status-changed', ...)
                                     │
◄── 200 OK { id, status: 'ACTIVE' }  │           ◄────── receives event ──────
                                     └──────────────────────────────────────►
6. User A's screen already
   updated (mutation response)    7. User B's SocketProvider listener fires:
                                     queryClient.invalidateQueries(['work-items', 'abc123'])
                                     ↓
                                     TanStack Query re-fetches GET /work-items
                                     ↓
                                  8. User B's screen updates automatically
```

---

## 7. Backend Implementation in This Project

### 7a. SocketEventEmitter (Singleton)
**File:** `src/infrastructure/socket/SocketEventEmitter.ts`

This is a simple singleton that holds a reference to the Socket.io server instance. Other parts of the code call `emit()` to send events without knowing about Socket.io internals.

```typescript
import { Server as SocketIOServer } from 'socket.io';

class SocketEventEmitter {
  private io: SocketIOServer | null = null;

  init(io: SocketIOServer) {
    this.io = io;
  }

  emit(workspaceId: string, event: string, payload: object) {
    if (!this.io) return;  // no-op if socket not initialized
    this.io.to(`workspace:${workspaceId}`).emit(event, payload);
  }
}

export const socketEventEmitter = new SocketEventEmitter();
```

### 7b. SocketServer (Setup)
**File:** `src/infrastructure/socket/SocketServer.ts`

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { tokenService } from '../...(TokenServiceImpl)';
import { socketEventEmitter } from './SocketEventEmitter';

export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    }
  });

  // Auth middleware — verify JWT on every connection
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));
      const decoded = tokenService.verifyToken(token);
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // On connection: client joins workspace room
  io.on('connection', (socket) => {
    socket.on('join-workspace', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('leave-workspace', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
    });
  });

  // Give the emitter a reference to the io instance
  socketEventEmitter.init(io);
  return io;
}
```

### 7c. AuditLogServiceImpl (Updated)
**File:** `src/modules/audit-log/infrastructure/mongoose/AuditLogServiceImpl.ts`

The `socketEventEmitter` is injected optionally (so existing tests don't break):

```typescript
async log(dto: CreateAuditLogDTO): Promise<void> {
  try {
    await this.recordAuditUC.execute(dto);
    // Emit real-time event (fire-and-forget, same as audit log)
    socketEventEmitter.emit(dto.workspaceId, this.toSocketEvent(dto.action), {
      targetId: dto.targetId,
      targetType: dto.targetType,
      workspaceId: dto.workspaceId,
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}
```

The `toSocketEvent()` method maps `AuditAction` enum values to socket event names:
```typescript
private toSocketEvent(action: AuditAction): string {
  const map: Record<string, string> = {
    WORK_ITEM_STATUS_CHANGED:     'work-item:status-changed',
    WORK_ITEM_DOCUMENT_LINKED:    'work-item:document-linked',
    WORK_ITEM_DOCUMENT_UNLINKED:  'work-item:document-unlinked',
    DOCUMENT_UPLOADED:            'document:uploaded',
    DOCUMENT_DELETED:             'document:deleted',
    WORKSPACE_MEMBER_INVITED:     'workspace:member-invited',
    WORKSPACE_MEMBER_ROLE_UPDATED:'workspace:member-updated',
    WORKSPACE_MEMBER_REMOVED:     'workspace:member-removed',
  };
  return map[action] ?? action;
}
```

---

## 8. Frontend Implementation (Next.js)

> Note: The frontend (`workspaceops-frontend`) is currently in planning stage. This section describes the exact files and code to add when frontend implementation begins.

### 8a. Install Socket.io client
```bash
npm install socket.io-client
```

### 8b. Create Socket Client Singleton
**File:** `src/lib/socket/socketClient.ts`

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('workspaceops_token');
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### 8c. Create SocketProvider React Context
**File:** `src/context/SocketProvider.tsx`

This wraps the workspace layout. It connects to the socket, joins the workspace room, and on receiving events — calls `queryClient.invalidateQueries()` which triggers TanStack Query to re-fetch. **No new API calls or data schemas are introduced.**

```typescript
'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, disconnectSocket } from '@/lib/socket/socketClient';

interface SocketProviderProps {
  workspaceId: string;
  children: React.ReactNode;
}

export function SocketProvider({ workspaceId, children }: SocketProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    // Join this workspace's room
    socket.emit('join-workspace', workspaceId);

    // Work item events
    socket.on('work-item:status-changed', () => {
      queryClient.invalidateQueries({ queryKey: ['work-items', workspaceId] });
    });

    socket.on('work-item:document-linked', (data: { targetId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['work-item', data.targetId] });
    });

    socket.on('work-item:document-unlinked', (data: { targetId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['work-item', data.targetId] });
    });

    // Document events
    socket.on('document:uploaded', () => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    });

    socket.on('document:deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['documents', workspaceId] });
    });

    // Workspace membership events
    socket.on('workspace:member-invited', () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    });

    socket.on('workspace:member-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    });

    socket.on('workspace:member-removed', () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
      // Also re-check current user's own role
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    });

    return () => {
      // Clean up when leaving the workspace
      socket.emit('leave-workspace', workspaceId);
      socket.off('work-item:status-changed');
      socket.off('work-item:document-linked');
      socket.off('work-item:document-unlinked');
      socket.off('document:uploaded');
      socket.off('document:deleted');
      socket.off('workspace:member-invited');
      socket.off('workspace:member-updated');
      socket.off('workspace:member-removed');
    };
  }, [workspaceId, queryClient]);

  return <>{children}</>;
}
```

### 8d. Wrap the Workspace Layout
**File:** `src/app/(app)/[workspaceId]/layout.tsx`

Add `SocketProvider` around the workspace children. It sits alongside the existing sidebar/topbar:

```tsx
import { SocketProvider } from '@/context/SocketProvider';

export default function WorkspaceLayout({ children, params }) {
  const { workspaceId } = params;

  return (
    <AppShell workspaceId={workspaceId}>
      <SocketProvider workspaceId={workspaceId}>
        {children}
      </SocketProvider>
    </AppShell>
  );
}
```

That's it. **No other frontend files need to change.** Every page that uses TanStack Query with the right query keys automatically gets real-time updates.

### 8e. Environment Variable
Add to frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 9. Summary Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (port 4000)                      │
│                                                                   │
│  HTTP Server (http.createServer(app))                             │
│       ├── Express REST routes (/workspaces, /work-items, etc.)   │
│       └── Socket.io server (ws://:4000)                          │
│               ├── Auth middleware (verify JWT on connect)         │
│               └── Room management (join-workspace event)         │
│                                                                   │
│  AuditLogServiceImpl.log(dto)                                     │
│       ├── writes to MongoDB AuditLog collection                   │
│       └── socketEventEmitter.emit(workspaceId, event, payload)   │
│               └── io.to('workspace:id').emit(event, payload)     │
└─────────────────────────────────────────────────────────────────┘
         ↑ REST (HTTP)            ↕ WebSocket (persistent)
         │                        │
┌────────┴────────────────────────┴────────────────────────────────┐
│                      FRONTEND (Next.js)                           │
│                                                                   │
│  [workspaceId]/layout.tsx                                         │
│       └── <SocketProvider workspaceId={workspaceId}>             │
│               ├── getSocket() → connects to ws://localhost:4000  │
│               ├── socket.emit('join-workspace', workspaceId)     │
│               └── socket.on('work-item:status-changed', () => {  │
│                     queryClient.invalidateQueries(...)            │
│                   })                                              │
│                                                                   │
│  Any page using useQuery(['work-items', workspaceId])            │
│       → automatically re-fetches when socket event fires         │
└──────────────────────────────────────────────────────────────────┘
```

**Key insight:** The REST API and WebSocket work independently. The REST API response format never changes. The socket is purely a notification mechanism — it tells the frontend "something changed", and the frontend uses the existing REST API to fetch what changed.

---

## Deferred Real-Time Features (Future)

These events will be added in a future iteration — they were intentionally excluded from this implementation to keep scope manageable:
- Overview/dashboard stats updates → `overview:updated`
- Audit log live feed → `audit-log:created`
- Document expiry status changes → `document:expiry-changed`
- Work item metadata updates → `work-item:updated`

See `PLAN/future-enhancements.md` for details.
