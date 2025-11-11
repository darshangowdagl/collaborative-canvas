## Collaborative Canvas

A real-time collaborative drawing web app built with Vanilla JavaScript, HTML5 Canvas, Node.js, Express, and Socket.io.

### Features
- Brush and eraser tools
- Color and stroke width controls
- Real-time live drawing sync over WebSockets
- Cursor indicators for connected users
- Global undo/redo synchronized across clients
- User list with unique color assignment
- Smooth strokes with basic point interpolation and throttled events

### Tech Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express + Socket.io
- Communication: WebSockets (Socket.io)

### Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser.
4. Open multiple tabs or browsers to simulate multiple users.

### How to Use
- Select Brush or Eraser.
- Choose a color and adjust stroke width.
- Draw on the canvas. Changes appear in real time for all users.
- Undo: Ctrl/Cmd + Z
- Redo: Ctrl/Cmd + Shift + Z

### Deployment
- This app is ready to deploy to platforms like Render or Railway.
- Ensure the server `PORT` environment variable is set by the platform.
- The server serves static files from the `client` directory and exposes `/socket.io` for WebSocket connections.

### Known Limitations
- The in-memory drawing state will reset on server restart.
- Remote stroke styling while in-progress uses a lightweight cache; if the client misses `draw:begin`, it may render a segment with fallback styling until the next begin occurs.
- No persistent storage. For production, integrate a store (Redis/Postgres) and add auth.

## Tools & Notes
- Built with: Node.js, Express, Socket.io, HTML5 Canvas, Vanilla JavaScript.
- Development helpers: I used Cursor/GPT to scaffold initial project files and to get advice on architecture. I implemented the main drawing logic, undo/redo, conflict resolution, and UI refinements myself and tested the system locally.

### Screenshots
- Placeholder: add screenshots of the canvas and multi-user cursors here.

### License
MIT


