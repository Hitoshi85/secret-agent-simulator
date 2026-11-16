// Finding your way: gold arrows at the screen edge pointing to leads you haven't visited (only the
// direction and distance, never who or what is there), the round minimap in the corner, and the big
// drawn map behind the Map button. Leads come from the case (src/case/view.js).
import { drawCity, pin, arrow, BOUNDS } from './mapdraw.js';

const $ = (id) => document.getElementById(id);
const MINI_SCALE = 0.55; // minimap pixels per metre
const HIDE_NEAR = 10; // metres: no arrow once the gold ring is right there

export function makeNavaids({ caseView, agent, cam }) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  // The city drawn once at minimap scale, so each minimap frame is a single cropped copy.
  const base = document.createElement('canvas');
  base.width = Math.ceil((BOUNDS.x1 - BOUNDS.x0) * MINI_SCALE * dpr); base.height = Math.ceil((BOUNDS.z1 - BOUNDS.z0) * MINI_SCALE * dpr);
  const bctx = base.getContext('2d'); bctx.scale(dpr, dpr);
  drawCity(bctx, { cx: (BOUNDS.x0 + BOUNDS.x1) / 2, cz: (BOUNDS.z0 + BOUNDS.z1) / 2, scale: MINI_SCALE, w: base.width / dpr, h: base.height / dpr });
  const mini = $('mini'), mctx = mini.getContext('2d');
  const size = mini.clientWidth || 104;
  mini.width = size * dpr; mini.height = size * dpr;

  // One arrow element per lead, reused every frame.
  const pills = new Map();
  const pillFor = (t) => {
    let p = pills.get(t);
    if (!p) {
      p = document.createElement('div'); p.className = 'lead'; p.innerHTML = '<i></i><span></span>';
      $('leads').appendChild(p); pills.set(t, p);
    }
    return p;
  };

  const n = { leads: [] }; // what tests see: each open lead's distance and screen side
  let miniTimer = 0;

  n.update = (dt, w, h) => {
    const open = caseView.leads();
    n.leads.length = 0;
    // Edge arrows: the lead's bearing relative to where the camera looks, placed on a box inside the screen.
    const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    const box = { l: 48, r: w - 48, t: Math.min(200, h * 0.28), b: h - (h < 500 ? 60 : 110) }; // inset by half an arrow's width
    const mx = (box.l + box.r) / 2, my = (box.t + box.b) / 2, hw = (box.r - box.l) / 2, hh = (box.b - box.t) / 2;
    for (const [t, p] of pills) if (!open.includes(t)) p.hidden = true;
    for (const t of open) {
      const [x, z] = caseView.where(t), dx = x - agent.x, dz = z - agent.z, d = Math.hypot(dx, dz);
      const p = pillFor(t);
      if (d < HIDE_NEAR) { p.hidden = true; continue; }
      const fwd = dx * sy + dz * cy, right = -dx * cy + dz * sy, a = Math.atan2(right, fwd);
      const ux = Math.sin(a), uy = -Math.cos(a), k = Math.min(hw / Math.abs(ux || 1e-6), hh / Math.abs(uy || 1e-6));
      const px = mx + ux * k, py = my + uy * k;
      p.hidden = false;
      p.firstChild.style.transform = `rotate(${a}rad)`;
      const label = `${Math.round(d / 10) * 10} m`;
      if (p.lastChild.textContent !== label) p.lastChild.textContent = label;
      n.leads.push({ id: t.id, d: Math.round(d), ahead: fwd > 0, x: px, y: py, p });
    }
    // Arrows that land on top of each other are spread apart along their edge.
    const onRow = (l) => Math.abs(l.y - box.t) < 1 || Math.abs(l.y - box.b) < 1;
    for (const edge of [box.t, box.b]) spread(n.leads.filter((l) => onRow(l) && Math.abs(l.y - edge) < 1), 'x', 78, box.l, box.r);
    for (const side of [box.l, box.r]) spread(n.leads.filter((l) => !onRow(l) && Math.abs(l.x - side) < 1), 'y', 32, box.t, box.b);
    for (const l of n.leads) { l.p.style.transform = `translate(${Math.round(l.x)}px, ${Math.round(l.y)}px) translate(-50%, -50%)`; delete l.p; }
    // Minimap, ten times a second.
    if ((miniTimer -= dt) > 0) return;
    miniTimer = 0.1;
    const s = size, half = s / 2;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.fillStyle = '#d8c39c'; mctx.fillRect(0, 0, s, s);
    const bx = (agent.x - BOUNDS.x0) * MINI_SCALE - half, bz = (agent.z - BOUNDS.z0) * MINI_SCALE - half;
    mctx.drawImage(base, bx * dpr, bz * dpr, s * dpr, s * dpr, 0, 0, s, s);
    for (const t of open) { const [x, z] = caseView.where(t); pin(mctx, half + (x - agent.x) * MINI_SCALE, half + (z - agent.z) * MINI_SCALE, 3.5); }
    arrow(mctx, half, half, agent.heading, 7);
  };

  // The big map: the whole slice fitted between the header and the Go-to buttons.
  n.drawBig = () => {
    const c = $('bigmap'), w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The free area: below the header, and beside the Go-to panel (landscape) or above it (portrait).
    const go = $('mapGo'), side = go.offsetLeft > w / 2;
    const area = { l: 0, t: $('mapHead').offsetHeight + 10, r: side ? go.offsetLeft - 10 : w, b: side ? h - 10 : go.offsetTop - 10 };
    const x0 = -340, x1 = 140, z0 = -100, z1 = 900; // the part of the city worth showing
    const scale = Math.min((area.r - area.l) / (x1 - x0), (area.b - area.t) / (z1 - z0));
    const v = { cx: (x0 + x1) / 2 - ((area.l + area.r) / 2 - w / 2) / scale, cz: (z0 + z1) / 2 - ((area.t + area.b) / 2 - h / 2) / scale, scale, w, h };
    const { X, Z } = drawCity(ctx, v, { labels: true });
    const open = caseView.leads();
    for (const t of caseView.targets) if (t.kind !== 'suspect') { const [x, z] = t.at; pin(ctx, X(x), Z(z), 6, { hollow: !open.includes(t) }); }
    arrow(ctx, X(agent.x), Z(agent.z), agent.heading, 10);
  };

  return n;
}

// Spaces items along one axis at least `gap` apart, keeping them within [lo, hi].
function spread(items, k, gap, lo, hi) {
  items.sort((a, b) => a[k] - b[k]);
  for (let i = 1; i < items.length; i++) items[i][k] = Math.max(items[i][k], items[i - 1][k] + gap);
  const over = items.length ? items[items.length - 1][k] - hi : 0;
  if (over > 0) for (const it of items) it[k] = Math.max(lo, it[k] - over);
}
