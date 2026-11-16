// The HUD and every way the player gives input: taps and drags on the city, the buttons, keys.
import { PLACES } from './world/city.js';

const $ = (id) => document.getElementById(id);
let toastTimer = 0;

export function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

export function showLocation(name) { if ($('locName').textContent !== name) $('locName').textContent = name; }

export function setupUI({ canvas, act, onTap, onDrag }) {
  let lastTap = null; // a second tap close by within 350 ms is a double tap: run there
  for (const p of PLACES) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = p.name; b.dataset.act = 'jump'; b.dataset.place = p.id;
    $('places').appendChild(b);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    act(b.dataset.act, b.dataset.place);
  });
  $('pause').addEventListener('click', () => act('pause'));
  $('feedback').addEventListener('click', () => act('feedback'));

  // A short press without much movement is a tap (walk there); otherwise it drags the camera round.
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), lastX: e.clientX, lastY: e.clientY, dragged: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) down.dragged = true;
    if (down.dragged) { onDrag(e.clientX - down.lastX, e.clientY - down.lastY); down.lastX = e.clientX; down.lastY = e.clientY; }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (down && !down.dragged) {
      const now = performance.now();
      const run = !!lastTap && now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40;
      lastTap = run ? null : { t: now, x: e.clientX, y: e.clientY };
      onTap(e.clientX, e.clientY, run);
    }
    down = null;
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  const keys = new Set();
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'p' || k === 'escape') return act('pause');
    if (k === 'm') return act('map');
    if (k === 'n') return act('notebook');
    if (k === 'f') return act('feedback');
    if (k === 'enter') return act('start');
    keys.add(k);
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) act('pause', 'auto'); });

  // Keyboard walking direction relative to the camera: [forward, right], and turning.
  return () => ({
    forward: (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0),
    right: (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
    turn: (keys.has('e') ? 1 : 0) - (keys.has('q') ? 1 : 0),
    run: keys.has('shift'),
  });
}

export const show = (id, on) => { $(id).hidden = !on; };
