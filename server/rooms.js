// Handles rooms, users, and color management for the drawing app.

const { DrawingState } = require('./drawing-state');

class RoomsManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { users, colorsInUse, drawingState }
  }

  ensureRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        colorsInUse: new Set(),
        drawingState: new DrawingState()
      });
    }
    return this.rooms.get(roomId);
  }

  join(roomId, socketId, displayName) {
    const room = this.ensureRoom(roomId);
    const color = this.assignColor(room);
    const user = {
      id: socketId,
      name: displayName || `Guest-${socketId.slice(0, 5)}`,
      color
    };
    room.users.set(socketId, user);
    return user;
  }

  leave(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const user = room.users.get(socketId);
    if (user) {
      room.users.delete(socketId);
      room.colorsInUse.delete(user.color);
    }
    return user;
  }

  listUsers(roomId) {
    const room = this.ensureRoom(roomId);
    return Array.from(room.users.values());
  }

  getUser(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.users.get(socketId) || null;
  }

  getDrawingState(roomId) {
    return this.ensureRoom(roomId).drawingState;
  }

  assignColor(room) {
    const palette = [
      '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
      '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
      '#008080', '#e6beff', '#9A6324', '#fffac8', '#800000',
      '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'
    ];
    for (const c of palette) {
      if (!room.colorsInUse.has(c)) {
        room.colorsInUse.add(c);
        return c;
      }
    }
    // If all colors are taken, assign a random one
    const rand = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    room.colorsInUse.add(rand);
    return rand;
  }
}

module.exports = { RoomsManager };
