// Draws the slice of Florence from above, north up, on a 2D canvas: the blocks of palazzi, the
// streets and piazzas you can walk, the Arno and Ponte Vecchio, the landmarks, and pins on top.
// The corner minimap and the big Map both use it (see src/ui/maps.js).
import { BOUNDS, WALK, RIVER, LANDMARKS } from './world/city.js';

const C = { block: '#d8c39c', edge: '#b9a37b', street: '#f6eedb', river: '#8fb7c9', bank: '#6f98ab', landmark: '#c99a6b', dome: '#b8573a', text: '#3a2f22' };

// view: { cx, cz } the world point at the centre, scale in pixels per metre, w and h of the canvas.
export function drawCity(ctx, view, { labels = false } = {}) {
  const { cx, cz, scale, w, h } = view;
  const X = (x) => w / 2 + (x - cx) * scale, Z = (z) => h / 2 + (z - cz) * scale;
  const rect = (r, fill) => { ctx.fillStyle = fill; ctx.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * scale, (r[3] - r[1]) * scale); };
  ctx.fillStyle = C.block; ctx.fillRect(0, 0, w, h);
  rect([BOUNDS.x0, RIVER[1], BOUNDS.x1, RIVER[3]], C.river);
  ctx.fillStyle = C.bank; ctx.fillRect(0, Z(RIVER[1]) - 1, w, 2); ctx.fillRect(0, Z(RIVER[3]) - 1, w, 2);
  for (const a of WALK) rect(a.r, C.street);
  for (const l of Object.values(LANDMARKS)) {
    for (const b of l.block || []) rect(b, C.landmark);
    if (l.circle) { ctx.fillStyle = C.landmark; ctx.beginPath(); ctx.arc(X(l.at[0]), Z(l.at[1]), l.circle * scale, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = C.dome; ctx.beginPath(); ctx.arc(X(LANDMARKS.duomo.at[0]), Z(LANDMARKS.duomo.at[1]), 24 * scale, 0, Math.PI * 2); ctx.fill();
  if (labels) {
    ctx.fillStyle = C.text; ctx.font = `600 ${Math.max(10, Math.round(11 * Math.min(2, scale * 2.4)))}px -apple-system, Helvetica, sans-serif`; ctx.textAlign = 'left';
    for (const [name, x, z] of LABELS) ctx.fillText(name, X(x), Z(z));
  }
  return { X, Z };
}

// Where the names go on the big map (world x, z of the text's start).
const LABELS = [
  ['Piazza del Duomo', -60, 100], ['Via dei Calzaiuoli', -96, 250], ['Piazza della Signoria', -36, 414],
  ['Ponte Vecchio', -128, 668], ['Arno', -330, 676], ['Oltrarno', -128, 790], ['Palazzo Pitti', -196, 896],
];

// A gold pin (lead), a hollow ring (visited) or the agent's arrow.
export function pin(ctx, x, y, r, { fill = '#e8b93c', stroke = '#5a4210', hollow = false } = {}) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, r / 3); ctx.strokeStyle = stroke;
  if (!hollow) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.stroke();
}
export function arrow(ctx, x, y, heading, size) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-heading + Math.PI); // heading: (sin, cos) = (x, z); z points down the map
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, size * 0.8); ctx.lineTo(0, size * 0.4); ctx.lineTo(-size * 0.7, size * 0.8); ctx.closePath();
  ctx.fillStyle = '#2f7fd6'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke(); ctx.restore();
}
export { BOUNDS };
