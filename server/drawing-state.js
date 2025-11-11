// Manages drawing data for a room: active strokes, undo/redo, and committed history.

class DrawingState {
  constructor() {
    this.operations = []; // Committed strokes
    this.redoStack = []; // For redo actions
    this.inProgress = new Map(); // strokeId -> stroke data
    this.revision = 0; // Tracks updates
  }

  beginStroke(stroke) {
    const strokeCopy = {
      id: stroke.id,
      points: stroke.points ? [...stroke.points] : [],
      color: stroke.color,
      size: stroke.size,
      tool: stroke.tool,
      userId: stroke.userId,
      ts: stroke.ts || Date.now()
    };
    this.inProgress.set(strokeCopy.id, strokeCopy);
    return strokeCopy;
  }

  appendPoints(strokeId, points) {
    const stroke = this.inProgress.get(strokeId);
    if (!stroke) return null;
    if (Array.isArray(points) && points.length > 0) {
      for (const p of points) {
        stroke.points.push({ x: p.x, y: p.y });
      }
    }
    return stroke;
  }

  endStroke(strokeId) {
    const stroke = this.inProgress.get(strokeId);
    if (!stroke) return null;
    this.inProgress.delete(strokeId);
    this.operations.push(stroke);
    this.redoStack = [];
    this.revision += 1;
    return stroke;
  }

  undo() {
    if (this.operations.length === 0) return null;
    const op = this.operations.pop();
    this.redoStack.push(op);
    this.revision += 1;
    return op;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const op = this.redoStack.pop();
    this.operations.push(op);
    this.revision += 1;
    return op;
  }

  clearAll() {
    this.operations = [];
    this.redoStack = [];
    this.inProgress.clear();
    this.revision += 1;
  }

  serialize() {
    return {
      operations: this.operations.map(op => ({
        id: op.id,
        points: op.points,
        color: op.color,
        size: op.size,
        tool: op.tool,
        userId: op.userId,
        ts: op.ts
      })),
      revision: this.revision
    };
  }
}

module.exports = { DrawingState };
