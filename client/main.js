(function () {
  function initUI() {
    if (!window.Canvas || !window.WS || !window.Utils) {
      console.error('Missing modules: Canvas / WS / Utils must load before main.js');
      return;
    }

    Canvas.initControls();
    WS.connect();

    const brushBtn = document.getElementById('tool-brush');
    const eraserBtn = document.getElementById('tool-eraser');
    const colorInput = document.getElementById('color-picker');
    const strokeRange = document.getElementById('stroke-width');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');

    if (brushBtn) brushBtn.addEventListener('click', () => Canvas.setTool('brush'));
    if (eraserBtn) eraserBtn.addEventListener('click', () => Canvas.setTool('eraser'));
    if (colorInput) colorInput.addEventListener('input', e => Canvas.setColor(e.target.value));

    if (strokeRange) {
      strokeRange.addEventListener('input', e => Canvas.setSize(Number(e.target.value)));
      const span = document.getElementById('stroke-width-value');
      if (span) span.textContent = String(Number(strokeRange.value || 4));
    }

    if (undoBtn) undoBtn.addEventListener('click', () => WS.emit('undo'));
    if (redoBtn) redoBtn.addEventListener('click', () => WS.emit('redo'));

    // Keyboard shortcuts for undo/redo
    window.addEventListener('keydown', e => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        WS.emit('undo');
      } else if (ctrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        WS.emit('redo');
      }
    });

    window.addEventListener('load', () => {
      document.title = 'Collaborative Canvas';
    });
  }

  window.addEventListener('load', initUI);
})();
