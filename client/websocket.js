(function () {
  let socket = null;
  let selfUser = null;

  const throttleCursor = (typeof Utils !== 'undefined' && Utils.throttle)
    ? Utils.throttle((x, y) => {
        if (socket) socket.emit('cursor', { x, y });
      }, 30)
    : () => {};

  function connect() {
    if (typeof io === 'undefined') {
      console.error('[WS] socket.io client not found');
      return;
    }

    socket = io();

    socket.on('connect', () => {
      socket.emit('join', { name: null }); // server assigns Guest-xxxx
    });

    socket.on('joined', payload => {
      selfUser = payload.user;
      if (window.Canvas?.handleJoined) window.Canvas.handleJoined(payload);
    });

    socket.on('users:update', ({ users } = {}) => {
      if (window.Canvas?.handleUsersUpdate) window.Canvas.handleUsersUpdate(users || []);
    });

    socket.on('cursor', ({ userId, x, y }) => {
      const usersEls = document.querySelectorAll('#users .user');
      let name = null;
      for (const el of usersEls) {
        if (el?.textContent?.includes(userId.slice(0, 5))) {
          name = el.textContent.trim();
          break;
        }
      }
      if (window.Canvas?.handleCursor) {
        window.Canvas.handleCursor(userId, x, y, null, name);
      }
    });

    socket.on('draw:begin', stroke => {
      if (window.Canvas?.handleRemoteDrawBegin) window.Canvas.handleRemoteDrawBegin(stroke);
    });

    socket.on('draw:points', data => {
      if (window.Canvas?.handleRemoteDrawPoints) window.Canvas.handleRemoteDrawPoints(data);
    });

    socket.on('draw:end', data => {
      if (window.Canvas?.handleRemoteDrawEnd) window.Canvas.handleRemoteDrawEnd(data);
    });

    socket.on('state:update', payload => {
      if (window.Canvas?.handleStateUpdate) window.Canvas.handleStateUpdate(payload);
    });

    socket.on('state:commit', payload => {
      if (window.Canvas?.handleStateCommit) window.Canvas.handleStateCommit(payload);
    });

    socket.on('disconnect', () => {
      console.log('[WS] disconnected');
    });
  }

  function emit(event, payload) {
    if (socket) socket.emit(event, payload);
  }

  function emitThrottledPoints(strokeId, points) {
    if (socket) socket.emit('draw:points', { id: strokeId, points });
  }

  function emitCursor(x, y) {
    if (throttleCursor) throttleCursor(x, y);
  }

  window.WS = {
    connect,
    emit,
    emitThrottledPoints,
    emitCursor
  };
})();
