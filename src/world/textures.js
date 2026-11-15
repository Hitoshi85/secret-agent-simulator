// Every texture is painted at startup on a canvas: no image files to download.
import * as THREE from 'three';
import { rnd } from './rand.js';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const finish = (c, wrap = true) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

// One bay of a Florentine palazzo, four floors: a rusticated ground floor with an arched door or shop,
// arched windows in pietra serena surrounds with green louvred shutters, string courses between floors.
export function facadeTex(base, shutter) {
  const W = 256, H = 1024, [c, g] = canvas(W, H);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '70,45,25'},${rnd() * 0.07})`; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 10, 2 + rnd() * 10); }
  for (let i = 0; i < 14; i++) { const x = rnd() * W, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(60,40,20,.10)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + rnd() * 6, H * rnd()); }
  const stone = '#b7ad99', stoneDk = '#8f8674', fh = H / 4, gy = 3 * fh;
  g.fillStyle = '#c9b48f'; g.fillRect(0, gy, W, fh);
  g.strokeStyle = 'rgba(70,55,35,.55)'; g.lineWidth = 3;
  for (let y = gy; y < H; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    for (let x = ((y - gy) / 32) % 2 ? 0 : 40; x < W; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
  }
  const dx = W * 0.22, dw = W * 0.56, dtop = gy + fh * 0.2, dr = dw / 2;
  g.fillStyle = stoneDk; g.beginPath(); g.moveTo(dx - 10, H); g.lineTo(dx - 10, dtop + dr); g.arc(W / 2, dtop + dr, dr + 10, Math.PI, 0); g.lineTo(dx + dw + 10, H); g.fill();
  const shop = rnd() < 0.5;
  g.fillStyle = shop ? '#6b4a2a' : '#3b2a1e'; g.beginPath(); g.moveTo(dx, H); g.lineTo(dx, dtop + dr); g.arc(W / 2, dtop + dr, dr, Math.PI, 0); g.lineTo(dx + dw, H); g.fill();
  if (shop) { g.fillStyle = 'rgba(255,220,160,.55)'; g.fillRect(dx + 10, dtop + dr, dw - 20, H - dtop - dr - 30); }
  g.strokeStyle = 'rgba(30,20,12,.8)'; g.lineWidth = 4;
  for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(dx + k * dw / 4, dtop + dr * 0.3); g.lineTo(dx + k * dw / 4, H); g.stroke(); }
  for (let f = 0; f < 3; f++) {
    const y0 = f * fh;
    g.fillStyle = stone; g.fillRect(0, y0 + fh - 10, W, 10); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y0 + fh, W, 4);
    const ww = W * 0.34, wx = (W - ww) / 2, wh = fh * 0.56, wy = y0 + fh * 0.2, r = ww / 2;
    g.fillStyle = stone; g.beginPath(); g.moveTo(wx - 9, wy + wh + 8); g.lineTo(wx - 9, wy + r); g.arc(W / 2, wy + r, r + 9, Math.PI, 0); g.lineTo(wx + ww + 9, wy + wh + 8); g.fill();
    g.strokeStyle = stoneDk; g.lineWidth = 2;
    for (let a = 0; a <= 8; a++) { const t = Math.PI + a * Math.PI / 8; g.beginPath(); g.moveTo(W / 2 + Math.cos(t) * r, wy + r + Math.sin(t) * r); g.lineTo(W / 2 + Math.cos(t) * (r + 9), wy + r + Math.sin(t) * (r + 9)); g.stroke(); }
    g.fillStyle = stone; g.fillRect(wx - 16, wy + wh + 4, ww + 32, 9); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx - 16, wy + wh + 13, ww + 32, 4);
    const open = rnd() < 0.5;
    g.fillStyle = '#2b2622'; g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + r); g.arc(W / 2, wy + r, r, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill();
    g.strokeStyle = 'rgba(200,200,190,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, wy + 4); g.lineTo(W / 2, wy + wh); g.moveTo(wx, wy + wh * 0.55); g.lineTo(wx + ww, wy + wh * 0.55); g.stroke();
    const shutterAt = (sx, sy, sw, sh) => {
      g.fillStyle = shutter; g.fillRect(sx, sy, sw, sh); g.fillStyle = 'rgba(0,0,0,.28)';
      for (let ly = sy + 4; ly < sy + sh - 2; ly += 7) g.fillRect(sx + 3, ly, sw - 6, 2.5);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.strokeRect(sx, sy, sw, sh);
    };
    if (open) { shutterAt(wx - 9 - ww * 0.5, wy + r * 0.4, ww * 0.48, wh - r * 0.4); shutterAt(wx + ww + 11, wy + r * 0.4, ww * 0.48, wh - r * 0.4); }
    else { shutterAt(wx + 2, wy + r * 0.55, ww / 2 - 3, wh - r * 0.55); shutterAt(W / 2 + 1, wy + r * 0.55, ww / 2 - 3, wh - r * 0.55); }
    if (f === 1 && rnd() < 0.3) {
      g.fillStyle = '#5a3a26'; g.fillRect(wx - 6, wy + wh + 13, ww + 12, 12);
      for (let k = 0; k < 9; k++) { g.fillStyle = ['#c0392b', '#e67e22', '#d35b8a', '#4e7d3a'][k % 4]; g.beginPath(); g.arc(wx + k * ww / 8, wy + wh + 11, 6, 0, 7); g.fill(); }
    }
  }
  g.fillStyle = 'rgba(255,245,225,.12)'; g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H);
  return finish(c);
}

export const FACADES = [
  ['#e8c99a', '#4f6b47'], ['#d9a066', '#4a6345'], ['#efdcb6', '#5e7552'], ['#c98a5a', '#55704c'],
  ['#e3b98a', '#3f5a40'], ['#f1e2c4', '#6b7d5a'], ['#cf9c6e', '#4d6748'], ['#e7cfa4', '#566b49'],
];

// Polychrome marble: white panels framed in green with pink inlays (Duomo, campanile, baptistery).
export function marbleTex(bands, panels) {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#f2ece0'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#3f6b55';
  for (let i = 0; i < bands; i++) g.fillRect(0, i * 512 / bands, 512, 6);
  for (let i = 0; i <= panels; i++) g.fillRect(i * 512 / panels - 4, 0, 8, 512);
  for (let i = 0; i < panels; i++) for (let j = 0; j < bands; j++) {
    const px = i * 512 / panels, py = j * 512 / bands;
    g.strokeStyle = '#3f6b55'; g.lineWidth = 4; g.strokeRect(px + 16, py + 14, 512 / panels - 32, 512 / bands - 28);
    if ((i + j) % 2) { g.fillStyle = 'rgba(190,110,110,.55)'; g.fillRect(px + 28, py + 26, 512 / panels - 56, 512 / bands - 52); }
  }
  return finish(c);
}

// The cathedral's west front: pilasters, banding, blind arcade, three pointed portals and rose windows.
export function duomoFrontTex() {
  const W = 1024, H = 768, [c, g] = canvas(W, H);
  const white = '#f2ece0', green = '#3f6b55', pink = '#d39a92';
  g.fillStyle = white; g.fillRect(0, 0, W, H);
  const pil = [0, 300, 724, 1000];
  pil.forEach((x) => { for (let y = 0; y < H; y += 24) { g.fillStyle = (y / 24) % 2 ? green : white; g.fillRect(x, y, 24, 24); } });
  [250, 470].forEach((y) => { g.fillStyle = green; g.fillRect(0, y, W, 10); g.fillStyle = pink; g.fillRect(0, y + 10, W, 6); });
  for (let x = 40; x < W - 40; x += 46) {
    if (pil.some((p) => x > p - 30 && x < p + 30)) continue;
    g.fillStyle = green; g.beginPath(); g.moveTo(x, 470); g.lineTo(x, 420); g.quadraticCurveTo(x + 18, 390, x + 36, 420); g.lineTo(x + 36, 470); g.fill();
    g.fillStyle = '#e8e0cf'; g.beginPath(); g.ellipse(x + 18, 435, 6, 22, 0, 0, 7); g.fill();
  }
  for (let x = 40; x < W - 40; x += 70) for (const y of [280, 560, 640]) {
    if (pil.some((p) => x > p - 50 && x < p + 30)) continue;
    g.strokeStyle = green; g.lineWidth = 5; g.strokeRect(x, y, 50, 60); g.fillStyle = pink; g.fillRect(x + 12, y + 14, 26, 32);
  }
  const portal = (cx, w, h) => {
    g.fillStyle = pink; g.beginPath(); g.moveTo(cx - w / 2 - 18, H); g.lineTo(cx - w / 2 - 18, H - h); g.quadraticCurveTo(cx - w / 2, H - h - w * 0.9, cx, H - h - w * 1.05); g.quadraticCurveTo(cx + w / 2, H - h - w * 0.9, cx + w / 2 + 18, H - h); g.lineTo(cx + w / 2 + 18, H); g.fill();
    g.fillStyle = '#8a6a3a'; g.beginPath(); g.moveTo(cx - w / 2, H); g.lineTo(cx - w / 2, H - h); g.quadraticCurveTo(cx - w / 2 + 10, H - h - w * 0.8, cx, H - h - w * 0.92); g.quadraticCurveTo(cx + w / 2 - 10, H - h - w * 0.8, cx + w / 2, H - h); g.lineTo(cx + w / 2, H); g.fill();
    g.fillStyle = '#c9a54a'; g.beginPath(); g.arc(cx, H - h - w * 0.35, w * 0.28, 0, 7); g.fill();
    g.strokeStyle = '#5a4020'; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx - w / 2 + k * w / 4, H - h + 10); g.lineTo(cx - w / 2 + k * w / 4, H); g.stroke(); }
  };
  portal(512, 120, 140); portal(170, 80, 110); portal(854, 80, 110);
  g.fillStyle = green; g.beginPath(); g.arc(512, 160, 92, 0, 7); g.fill();
  g.fillStyle = white; g.beginPath(); g.arc(512, 160, 80, 0, 7); g.fill();
  g.fillStyle = '#4a3a5a'; g.beginPath(); g.arc(512, 160, 66, 0, 7); g.fill();
  g.strokeStyle = '#d8c070'; g.lineWidth = 4;
  for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(512, 160); g.lineTo(512 + Math.cos(a / 16 * 6.283) * 66, 160 + Math.sin(a / 16 * 6.283) * 66); g.stroke(); }
  g.fillStyle = '#c9a54a'; g.beginPath(); g.arc(512, 160, 14, 0, 7); g.fill();
  [170, 854].forEach((x) => { g.fillStyle = green; g.beginPath(); g.arc(x, 150, 40, 0, 7); g.fill(); g.fillStyle = '#4a3a5a'; g.beginPath(); g.arc(x, 150, 30, 0, 7); g.fill(); });
  return finish(c, false);
}

// Rough sandstone blocks (pietra forte) for Palazzo Vecchio and the bridge.
export function stoneTex(base = '#b39a72', rows = 16) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const h = 256 / rows;
  for (let r = 0; r < rows; r++) for (let x = (r % 2) * -20; x < 256; x += 40) {
    const v = rnd() * 30 - 15; g.fillStyle = `rgba(${v > 0 ? '255,240,220' : '60,40,20'},${Math.abs(v) / 120})`; g.fillRect(x + 1, r * h + 1, 38, h - 2);
    g.strokeStyle = 'rgba(60,45,30,.45)'; g.lineWidth = 1.5; g.strokeRect(x + 0.5, r * h + 0.5, 39, h - 1);
  }
  return finish(c);
}

// Stone paving (pietra forte slabs).
export function pavingTex() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#857a69'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 512; x += 48) {
    const v = 135 + rnd() * 35; g.fillStyle = `rgb(${v},${v - 8},${v - 22})`; g.fillRect(x + 2, y + 2, 44, 28);
  }
  return finish(c);
}

// The sky dome: a vertical gradient.
export function skyTex(stops) {
  const [c, g] = canvas(2, 256); const gr = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  return finish(c, false);
}
