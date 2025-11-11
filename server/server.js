// Simple collaborative drawing server using Express and Socket.IO

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RoomsManager } = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'client');
const DEFAULT_ROOM = 'lobby';

const rooms = new RoomsManager();

// Serve static frontend
app.use(express.static(PUBLIC_DIR));

// Health check endpoint
app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  const roomId = DEFAULT_ROOM;
  let joined = false;

  // Handle user joining
  socket.on('join', (payload) => {
    if (joined) return;
    joined = true;

    socket.join(roomId);
    const displayName = payload?.name ? String(payload.name).slice(0, 40) : undefined;
    const user = rooms.join(roomId, socket.id, displayName);
    const state = rooms.getDrawingState(roomId).serialize();
    const users = rooms.listUsers(roomId);

    socket.emit('joined', { user, users, state });
    socket.to(roomId).emit('users:update', { users });
  });

  // Broadcast live cursor movement
  socket.on('cursor', (data) => {
    const user = rooms.getUser(roomId, socket.id);
    if (!user) return;
    const pos = { x: Number(data?.x) || 0, y: Number(data?.y) || 0 };
    socket.to(roomId).emit('cursor', { userId: user.id, x: pos.x, y: pos.y });
  });

  // Handle drawing actions
  socket.on('draw:begin', (stroke) => {
    const user = rooms.getUser(roomId, socket.id);
    if (!user || !stroke?.id) return;

    const ds = rooms.getDrawingState(roomId);
    ds.beginStroke({
      id: String(stroke.id),
      points: Array.isArray(stroke.points) ? stroke.points : [],
      color: String(stroke.color || user.color),
      size: Math.max(1, Math.min(100, Number(stroke.size) || 4)),
      tool: stroke.tool === 'eraser' ? 'eraser' : 'brush',
      userId: user.id,
      ts: Date.now()
    });

    socket.to(roomId).emit('draw:begin', {
      id: stroke.id,
      color: stroke.color || user.color,
      size: Number(stroke.size) || 4,
      tool: stroke.tool === 'eraser' ? 'eraser' : 'brush',
      userId: user.id
    });
  });

  socket.on('draw:points', (data) => {
    const user = rooms.getUser(roomId, socket.id);
    if (!user || !data?.id || !Array.isArray(data.points)) return;

    const ds = rooms.getDrawingState(roomId);
    ds.appendPoints(String(data.id), data.points);
    socket.to(roomId).emit('draw:points', { id: data.id, points: data.points });
  });

  socket.on('draw:end', (data) => {
    const user = rooms.getUser(roomId, socket.id);
    if (!user || !data?.id) return;

    const ds = rooms.getDrawingState(roomId);
    const stroke = ds.endStroke(String(data.id));
    if (!stroke) return;

    io.to(roomId).emit('state:commit', {
      committed: { id: stroke.id },
      revision: ds.revision
    });
  });

  // Undo / Redo
  socket.on('undo', () => {
    const ds = rooms.getDrawingState(roomId);
    const undone = ds.undo();
    if (!undone) return;
    io.to(roomId).emit('state:update', { state: ds.serialize() });
  });

  socket.on('redo', () => {
    const ds = rooms.getDrawingState(roomId);
    const redone = ds.redo();
    if (!redone) return;
    io.to(roomId).emit('state:update', { state: ds.serialize() });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    rooms.leave(roomId, socket.id);
    const users = rooms.listUsers(roomId);
    socket.to(roomId).emit('users:update', { users });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
