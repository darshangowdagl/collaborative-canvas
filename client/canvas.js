(function () {
  const state = {
    tool: 'brush',
    color: '#000000',
    size: 4,
    isDrawing: false,
    currentStrokeId: null,
    lastPoint: null,
    operations: [],
    revision: 0
  };

  let canvas, ctx, cursorsLayer, usersContainer, pixelRatio = 1;

  function setupCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) return console.error('[Canvas] #canvas not found');
    ctx = canvas.getContext('2d');
    cursorsLayer = document.getElementById('cursors');
    usersContainer = document.getElementById('users');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas || !ctx || typeof Utils === 'undefined') return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Utils.getPixelRatio(ctx);
    pixelRatio = ratio;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redrawAll();
  }

  function setTool(tool) {
    state.tool = tool === 'eraser' ? 'eraser' : 'brush';
    const b = document.getElementById('tool-brush');
    const e = document.getElementById('tool-eraser');
    if (b) b.classList.toggle('active', state.tool === 'brush');
    if (e) e.classList.toggle('active', state.tool === 'eraser');
  }

  function setColor(color) {
    state.color = color || '#000000';
  }

  function setSize(size) {
    state.size = Math.max(1, Math.min(100, Number(size) || 4));
    const span = document.getElementById('stroke-width-value');
    if (span) span.textContent = String(state.size);
  }

  function beginLocalStroke(x, y) {
    if (!window.WS) return;
    state.isDrawing = true;
    state.currentStrokeId = Utils.uid();
    state.lastPoint = { x, y };
    window.WS.emit('draw:begin', {
      id: state.currentStrokeId,
      color: state.color,
      size: state.size,
      tool: state.tool,
      points: [{ x, y }]
    });
  }

  function addLocalPoint(x, y) {
    if (!state.isDrawing || !state.currentStrokeId) return;
    const lp = state.lastPoint || { x, y };
    const dx = x - lp.x, dy = y - lp.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / 2));
    const segment = [];

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      segment.push({ x: lp.x + dx * t, y: lp.y + dy * t });
    }

    if (segment.length) {
      drawSegmentLocal(state.tool, state.color, state.size, [lp, ...segment]);
      if (window.WS) window.WS.emitThrottledPoints(state.currentStrokeId, segment);
      state.lastPoint = segment[segment.length - 1];
    } else {
      drawSegmentLocal(state.tool, state.color, state.size, [lp, { x, y }]);
      if (window.WS) window.WS.emitThrottledPoints(state.currentStrokeId, [{ x, y }]);
      state.lastPoint = { x, y };
    }
  }

  function endLocalStroke() {
    if (!state.isDrawing || !state.currentStrokeId) return;
    if (window.WS) window.WS.emit('draw:end', { id: state.currentStrokeId });
    state.isDrawing = false;
    state.currentStrokeId = null;
    state.lastPoint = null;
  }

  function drawSegmentLocal(tool, color, size, points) {
    if (!ctx || !points || points.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = size;
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color || '#000';
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function redrawAll() {
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const op of state.operations || []) {
      drawSegmentLocal(op.tool, op.color, op.size, op.points);
    }
  }

  function getCanvasCoords(evt) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    return { x, y };
  }

  function handlePointerDown(e) {
    const { x, y } = getCanvasCoords(e);
    beginLocalStroke(x, y);
  }

  function handlePointerMove(e) {
    const { x, y } = getCanvasCoords(e);
    if (window.WS?.emitCursor) window.WS.emitCursor(x, y);
    if (state.isDrawing) addLocalPoint(x, y);
  }

  function handlePointerUp() {
    endLocalStroke();
  }

  function handleLeave() {
    endLocalStroke();
  }

  function setUsers(users) {
    if (!usersContainer) return;
    usersContainer.innerHTML = users
      .map(u => `<div class="user"><span class="swatch" style="background:${u.color}"></span>${escapeHtml(u.name)}</div>`)
      .join('');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function updateStateFromServer(payload) {
    if (!payload?.state) return;
    state.operations = payload.state.operations || [];
    state.revision = payload.state.revision || 0;
    redrawAll();
  }

  const CanvasAPI = {
    initControls() {
      setupCanvas();

      if (canvas) {
        canvas.addEventListener('mousedown', handlePointerDown);
        canvas.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        canvas.addEventListener('mouseleave', handleLeave);

        canvas.addEventListener('touchstart', e => {
          e.preventDefault();
          const t = e.touches[0];
          handlePointerDown({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });

        canvas.addEventListener('touchmove', e => {
          e.preventDefault();
          const t = e.touches[0];
          handlePointerMove({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });

        window.addEventListener('touchend', handlePointerUp);
      }
    },
    setTool,
    setColor,
    setSize,
    handleUsersUpdate(users) { setUsers(users); },
    handleJoined(payload) {
      setUsers(payload.users || []);
      updateStateFromServer({ state: payload.state });
    },
    handleStateUpdate(payload) { updateStateFromServer(payload); },
    handleStateCommit() {},
    handleRemoteDrawBegin(stroke) {
      if (!stroke?.id) return;
      window.WS = window.WS || {};
      window.WS.remoteStrokeMeta = window.WS.remoteStrokeMeta || {};
      window.WS.remoteStrokeMeta[stroke.id] = {
        tool: stroke.tool || 'brush',
        color: stroke.color || '#000',
        size: Number(stroke.size) || 4
      };
    },
    handleRemoteDrawPoints(data) {
      if (!data?.id || !Array.isArray(data.points)) return;
      const meta = window.WS?.remoteStrokeMeta?.[data.id] || { tool: 'brush', color: '#000', size: 4 };
      drawSegmentLocal(meta.tool, meta.color, meta.size, data.points);
    },
    handleRemoteDrawEnd() {},
    handleCursor(userId, x, y, color, name) {
      if (!cursorsLayer) return;
      let el = document.querySelector(`.cursor[data-user="${CSS.escape(userId)}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'cursor';
        el.dataset.user = userId;
        el.innerHTML = `<div class="dot"></div><div class="label"></div>`;
        cursorsLayer.appendChild(el);
      }
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      const dot = el.querySelector('.dot');
      const label = el.querySelector('.label');
      if (dot) dot.style.background = color || '#000';
      if (label) label.textContent = name || userId.slice(0, 5);
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => el.remove(), 4000);
    },
    setHistory(ops, revision) {
      state.operations = Array.isArray(ops) ? ops : [];
      state.revision = revision || 0;
      redrawAll();
    }
  };

  window.Canvas = CanvasAPI;
})();
