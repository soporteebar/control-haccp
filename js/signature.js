/**
 * signature.js - Manejo de Firma Digital sobre Canvas
 * Soporta pantallas táctiles (móviles/tablets) y ratón (PC)
 */

class SignaturePad {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isDrawing = false;
    this.hasDrawn = false;
    this.lastX = 0;
    this.lastY = 0;

    this.initCanvas();
    this.attachEvents();
  }

  initCanvas() {
    // Configuración de trazo elegante color tinta azul/negra
    this.ctx.strokeStyle = '#1e3a8a';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.resizeCanvas();

    window.addEventListener('resize', () => {
      // Al redimensionar, guardar trazo actual si existe
      const data = this.isEmpty() ? null : this.toDataURL();
      this.resizeCanvas();
      if (data) this.fromDataURL(data);
    });
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Escalar con devicePixelRatio para evitar pixelado en pantallas Retina/Móviles
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    this.canvas.width = rect.width * ratio;
    this.canvas.height = rect.height * ratio;
    this.ctx.scale(ratio, ratio);

    this.ctx.strokeStyle = '#1e3a8a';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  attachEvents() {
    // Eventos de Ratón (Desktop)
    this.canvas.addEventListener('mousedown', (e) => this.start(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.move(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.stop());

    // Eventos Táctiles (Smartphones y Tablets)
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.target === this.canvas) e.preventDefault();
      const touch = e.touches[0];
      this.start(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.target === this.canvas) e.preventDefault();
      const touch = e.touches[0];
      this.move(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      this.stop();
    });
  }

  getCoordinates(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  start(clientX, clientY) {
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(clientX, clientY);
    this.lastX = x;
    this.lastY = y;
  }

  move(clientX, clientY) {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(clientX, clientY);

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasDrawn = true;
  }

  stop() {
    this.isDrawing = false;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasDrawn = false;
  }

  isEmpty() {
    return !this.hasDrawn;
  }

  toDataURL() {
    if (this.isEmpty()) return null;
    return this.canvas.toDataURL('image/png');
  }

  fromDataURL(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.clear();
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      this.hasDrawn = true;
    };
    img.src = dataUrl;
  }
}

window.SignaturePad = SignaturePad;
