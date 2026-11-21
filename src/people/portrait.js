// Painted noir portraits, drawn in code as SVG: the faces on the talk card, the Notebook and the
// handler's phone, and the faces painted onto the walking people (faceOnly). No image files.
// A portrait is built from a figure's look (skin, hair, clothes, hat, bag) and one of the face
// shapes in FACES, so a witness on the card matches the same witness in the street.
export const SKIN = ['#e9c4a6', '#c99a78', '#a8774f', '#7a5236', '#f0d3bb']; // figure.js re-exports these

const hex = (h) => { if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`; };
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
let uid = 0;

// Face shapes, one per skin tone (in SKIN order) and sex; the walking people use the same ones.
// W: cheek half-width, J: jaw half-width, age 0-1 (lines), eyes, beard (colour), stubble.
const M = [
  { W: 60, J: 50, age: 0.7, eyes: '#5a4a3a', beard: '#8a847c', stubble: true },
  { W: 62, J: 52, age: 0.45, eyes: '#4a3a22', beard: '#3a2818' },
  { W: 60, J: 50, age: 0.5, eyes: '#2a1a10', beard: '#2a2018', stubble: true },
  { W: 59, J: 47, age: 0.15, eyes: '#2a1a10', beard: '#1a1a1a', stubble: true },
  { W: 60, J: 50, age: 0.25, eyes: '#4a6a8a' },
];
const F = [
  { W: 55, J: 38, age: 0.15, eyes: '#4a5a3a', lip: '#a84a48' },
  { W: 55, J: 38, age: 0.3, eyes: '#4a3020', lip: '#9a4040' },
  { W: 55, J: 39, age: 0.35, eyes: '#3a2414', lip: '#8a3a32' },
  { W: 55, J: 38, age: 0.2, eyes: '#2a1a10', lip: '#6a2a26' },
  { W: 55, J: 38, age: 0.25, eyes: '#3a2a1a', lip: '#a83a3a' },
];
// Tiles of the 4 x 4 face atlas: 0-4 men and 5-9 women in SKIN order, 10 the agent, 15 plain white.
export const FACES = [
  ...M.map((f, i) => ({ ...f, skin: SKIN[i], seed: 11 + i * 7 })),
  ...F.map((f, i) => ({ ...f, skin: SKIN[i], fem: true, mouthW: 15, seed: 51 + i * 7 })),
  { W: 60, J: 50, age: 0.35, eyes: '#3a2a1a', skin: '#d2a582', seed: 81 },
];
export const isFem = (L) => !!(L.skirt || L.longHair);
export function faceTile(L) {
  if (L.suit) return 10;
  const i = SKIN.indexOf(L.skin);
  return i < 0 ? 0 : i + (isFem(L) ? 5 : 0);
}

// Your handler, the same voice in every case: silver bob, dark roll-neck, gold-rimmed glasses.
export const HANDLER = { seed: 21, fem: true, skin: '#e9c4a6', hair: '#c2bdb6', hairStyle: 'bob', age: 0.55, W: 56, J: 40, cloth: '#1d1f24', clothes: 'turtleneck', pendant: true, glasses: '#b89a4a', eyes: '#3a5a6a', lip: '#a04a48', earring: true, bg: ['#141820', '#4a5a72'], mouthW: 15 };

// A portrait for a figure's look (see randomLook in figure.js).
export function lookPortrait(L) {
  const f = FACES[faceTile(L)], fem = isFem(L);
  return {
    ...f, skin: L.skin, hair: L.hair, cloth: L.top, hat: L.hat, bag: L.bag,
    hairStyle: L.longHair ? 'long' : fem ? 'bob' : L.hat ? 'sides' : 'short',
    clothes: L.coat || L.suit ? 'coat' : 'shirt', bg: ['#2a2420', '#b08a60'],
  };
}

function headPath(W, J, top = 72, chin = 240) {
  const X = (s) => (x) => 150 + s * x, R = X(1), L = X(-1);
  return `M150,${top} C${R(W * 0.98)},${top} ${R(W * 1.1)},${top + 44} ${R(W)},150 C${R(W * 0.97)},180 ${R(J)},203 ${R(J * 0.62)},${chin - 18} C${R(17)},${chin - 3} ${R(8)},${chin} 150,${chin}`
    + ` C${L(8)},${chin} ${L(17)},${chin - 3} ${L(J * 0.62)},${chin - 18} C${L(J)},203 ${L(W * 0.97)},180 ${L(W)},150 C${L(W * 1.1)},${top + 44} ${L(W * 0.98)},${top} 150,${top}Z`;
}

// The SVG markup of one portrait. opts.vb crops it (viewBox); opts.faceOnly draws just the face on
// plain skin, for the atlas the walking people wear.
export function portraitSVG(ch, opts = {}) {
  seed = ch.seed || 7; const id = `pt${uid++}`, FO = !!opts.faceOnly;
  const W = ch.W || 60, J = ch.J || 46, age = ch.age || 0.3, fem = !!ch.fem;
  const skin = ch.skin, sh = mix(skin, '#4a2418', 0.38), deep = mix(skin, '#2a120c', 0.6), lt = mix(skin, '#fff3e4', 0.4), blush = mix(skin, '#c8463c', 0.28);
  const hair = ch.hair || '#2a1d16', hairSh = mix(hair, '#000', 0.45), hairLt = mix(hair, '#fff', 0.3);
  const defs = [], out = [], add = (s) => out.push(s);
  const blur = (n) => { const k = `${id}b${defs.length}`; defs.push(`<filter id="${k}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n}"/></filter>`); return `filter="url(#${k})"`; };
  const grad = (stops, rad, extra = '') => { const k = `${id}g${defs.length}`, t = rad ? 'radialGradient' : 'linearGradient'; defs.push(`<${t} id="${k}" ${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</${t}>`); return `url(#${k})`; };
  const shade = (d, col, op, soft) => add(`<path d="${d}" fill="${col}" opacity="${op}" ${blur(soft)}/>`);
  const head = headPath(W, J);

  // background, clothes, neck and ears (not on the atlas faces)
  if (FO) add(`<rect x="-50" y="-50" width="400" height="460" fill="${skin}"/>`);
  else {
    const bg = ch.bg || ['#3b2f2a', '#c98a4a'];
    add(`<rect width="300" height="360" fill="${grad([[0, bg[1]], [0.55, mix(bg[1], bg[0], 0.5)], [1, bg[0]]], false, 'x1="0" y1="0" x2="0.3" y2="1"')}"/>`);
    add(`<g ${blur(5)} opacity=".55"><path d="M-10,240 L-10,180 40,180 40,160 70,160 70,190 92,190 98,120 106,190 140,190 140,176 186,176 188,150 a36,36 0 0 1 72,0 L262,190 310,190 310,240Z" fill="${mix(bg[0], '#000', 0.2)}"/></g>`);
    add(`<circle cx="70" cy="70" r="60" fill="${mix(bg[1], '#fff2c8', 0.5)}" opacity=".35" ${blur(22)}/>`);
  }
  const figStart = out.length;
  if (!FO) {
    if (ch.hairStyle === 'long') add(`<path d="M${150 - W - 10},120 C${150 - W - 30},200 ${150 - W - 40},280 ${150 - W - 20},330 L${150 + W + 20},330 C${150 + W + 40},280 ${150 + W + 30},200 ${150 + W + 10},120Z" fill="${grad([[0, hair], [1, hairSh]], false, 'x1="0" y1="0" x2="0" y2="1"')}"/>`);
    add(`<path d="M116,205 L112,290 L188,290 L184,205Z" fill="${grad([[0, sh], [0.5, skin], [1, sh]], false, 'x1="0" y1="0" x2="1" y2="0"')}"/>`);
    shade('M118,215 C130,250 170,250 182,215 L182,262 C165,250 135,250 118,262Z', deep, 0.55, 6);
    const cl = ch.cloth || '#5a4a3a', clSh = mix(cl, '#000', 0.45), clLt = mix(cl, '#fff', 0.22);
    add(`<path d="M118,262 C95,268 40,278 22,300 C8,318 2,340 0,360 L300,360 C298,340 292,318 278,300 C260,278 205,268 182,262 Z" fill="${grad([[0, clLt], [0.45, cl], [1, clSh]], false, 'x1="0" y1="0" x2="1" y2="0.4"')}"/>`);
    shade('M190,272 C230,282 270,292 290,330 L300,360 L210,360 C215,320 205,290 190,272Z', clSh, 0.6, 7);
    if (ch.clothes === 'coat') {
      add(`<path d="M118,250 L96,300 L138,330 L150,300Z" fill="${mix(cl, '#fff', 0.1)}"/><path d="M182,250 L204,300 L162,330 L150,300Z" fill="${mix(cl, '#000', 0.25)}"/>`);
      add(`<path d="M134,268 L150,300 L166,268 C160,276 140,276 134,268Z" fill="#e9e2d4"/>`);
    } else if (ch.clothes === 'turtleneck') {
      add(`<path d="M116,232 C130,244 170,244 184,232 L186,272 C170,282 130,282 114,272Z" fill="${grad([[0, clLt], [1, clSh]], false, 'x1="0" y1="0" x2="1" y2="0"')}"/>`);
      for (let i = 0; i < 3; i++) add(`<path d="M118,${244 + i * 10} C135,${254 + i * 10} 165,${254 + i * 10} 182,${244 + i * 10}" stroke="${clSh}" stroke-width="2" fill="none" opacity=".7"/>`);
      if (ch.pendant) add('<path d="M135,280 Q150,330 165,280" stroke="#c9a24a" stroke-width="1.4" fill="none"/><circle cx="150" cy="306" r="4" fill="#d8b45a"/>');
    } else { // open-necked shirt
      add(`<path d="M124,262 L150,304 L176,262 C165,272 135,272 124,262Z" fill="${skin}"/>`);
      add(`<path d="M120,260 L150,306 L138,318Z M180,260 L150,306 L162,318Z" fill="${clLt}"/>`);
    }
    if (ch.bag) {
      add(`<path d="M70,284 L92,276 L236,360 L206,360Z" fill="${grad([[0, mix(ch.bag, '#fff', 0.2)], [1, mix(ch.bag, '#000', 0.3)]], false)}"/>`);
      add(`<path d="M80,282 L222,360" stroke="${mix(ch.bag, '#fff', 0.45)}" stroke-width="1" stroke-dasharray="4 3" fill="none" opacity=".8"/><rect x="146" y="316" width="16" height="12" rx="2" transform="rotate(30 154 322)" fill="none" stroke="#c9a24a" stroke-width="2.4"/>`);
    }
    for (const s of [-1, 1]) {
      const x = 150 + s * (W - 2);
      add(`<path d="M${x},140 C${x + s * 16},132 ${x + s * 18},172 ${x + s * 2},182 Z" fill="${s > 0 ? sh : skin}"/>`);
      add(`<path d="M${x + s * 3},148 C${x + s * 11},146 ${x + s * 11},168 ${x + s * 3},174" stroke="${deep}" stroke-width="2" fill="none" opacity=".5" ${blur(1)}/>`);
    }
    if (ch.earring) add(`<circle cx="${150 - W - 4}" cy="186" r="3" fill="#e0c06a"/>`);
  }

  // head and its shading (light from the upper left)
  add(`<path d="${head}" fill="${FO ? skin : grad([[0, lt], [0.45, skin], [1, sh]], true, 'cx="40%" cy="38%" r="70%"')}"/>`);
  const clip = `${id}c`; defs.push(`<clipPath id="${clip}"><path d="${head}"/></clipPath>`);
  add(`<g clip-path="url(#${clip})">`);
  if (!FO) {
    defs.push(`<filter id="${id}hl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="18" result="h"/><feDiffuseLighting in="h" surfaceScale="10" diffuseConstant="1.3" lighting-color="#fff3e6" result="d"><fePointLight x="40" y="50" z="150"/></feDiffuseLighting><feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1" result="m"/><feComposite in="m" in2="SourceAlpha" operator="in"/></filter>`);
    add(`<path d="${head}" fill="${mix(skin, '#fff', 0.08)}" filter="url(#${id}hl)" opacity=".7"/>`);
    shade(`M${150 + W * 0.45},70 C${150 + W * 0.2},120 ${150 + W * 0.55},170 ${150 + J * 0.3},245 L${150 + W + 20},245 L${150 + W + 20},70Z`, deep, 0.6, 10);
    shade(`M${150 + W * 0.5},172 C${150 + W * 0.8},176 ${150 + W * 0.85},196 ${150 + J * 0.7},212 C${150 + W * 0.55},196 ${150 + W * 0.45},184 ${150 + W * 0.5},172Z`, deep, 0.35, 6);
    shade(`M${150 - J},210 C130,246 170,246 ${150 + J},210 L${150 + J},260 L${150 - J},260Z`, deep, 0.3, 5);
  }
  for (const s of [-1, 1]) shade(`M${150 + s * 10},146 C${150 + s * 18},132 ${150 + s * 44},132 ${150 + s * 46},150 C${150 + s * 40},146 ${150 + s * 18},146 ${150 + s * 10},152Z`, deep, s > 0 ? 0.55 : 0.35, 4);
  shade('M156,150 C160,168 166,182 164,196 C160,192 157,186 155,182Z', deep, 0.5, 2.5);
  shade('M138,198 C146,203 154,203 162,198 C158,206 142,206 138,198Z', deep, 0.4, 2);
  shade('M136,222 C145,228 155,228 164,222 C158,232 142,232 136,222Z', deep, 0.35, 3);
  for (const s of [-1, 1]) add(`<ellipse cx="${150 + s * 34}" cy="188" rx="16" ry="11" fill="${blush}" opacity="${fem ? 0.45 : 0.25}" ${blur(7)}/>`);
  add(`<ellipse cx="128" cy="108" rx="22" ry="12" fill="${lt}" opacity=".55" ${blur(8)}/><path d="M148,160 L147,186" stroke="${lt}" stroke-width="4" opacity=".6" ${blur(2)}/>`);
  add(`<ellipse cx="149" cy="190" rx="4" ry="3" fill="#fff" opacity=".3" ${blur(1.5)}/><ellipse cx="116" cy="174" rx="10" ry="6" fill="${lt}" opacity=".45" ${blur(5)}/><ellipse cx="150" cy="232" rx="9" ry="5" fill="${lt}" opacity=".45" ${blur(4)}/>`);
  if (ch.beard) {
    const bd = `M${150 - W + 2},168 C${150 - W + 6},214 120,244 150,244 C180,244 ${150 + W - 6},214 ${150 + W - 2},168 C${150 + W - 14},196 180,200 168,206 C160,212 140,212 132,206 C120,200 ${150 - W + 14},196 ${150 - W + 2},168Z`;
    add(`<path d="${bd}" fill="${ch.beard}" opacity="${ch.stubble ? 0.35 : 0.95}" ${blur(ch.stubble ? 3 : 1.5)}/>`);
    for (let i = 0; i < 90; i++) {
      const a = 0.15 + rnd() * 2.85, r = 34 + rnd() * 46, x = 150 + Math.cos(a) * r * 0.78, y = 186 + Math.sin(a) * r * 0.62;
      if (Math.abs(x - 150) < 22 && y < 222 && y > 196) continue;
      add(`<path d="M${x},${y} l${(rnd() - 0.5) * 2},${2 + rnd() * 3}" stroke="${rnd() < 0.5 ? mix(ch.beard, '#fff', 0.35) : mix(ch.beard, '#000', 0.3)}" stroke-width="1.6" opacity=".5"/>`);
    }
  }
  if (age > 0.45) {
    const ln = (d, w = 1.6) => add(`<path d="${d}" stroke="${deep}" stroke-width="${w}" fill="none" opacity="${0.45 * age}" ${blur(0.8)}/>`);
    ln('M126,108 Q150,102 174,108'); ln('M132,118 Q150,113 168,118', 1.3);
    for (const s of [-1, 1]) { ln(`M${150 + s * 14},196 C${150 + s * 24},206 ${150 + s * 25},214 ${150 + s * 23},222`, 1.8); ln(`M${150 + s * 50},152 l${s * 7},-3 M${150 + s * 50},157 l${s * 7},1`, 1.1); ln(`M${150 + s * 18},166 Q${150 + s * 28},171 ${150 + s * 38},165`, 1.1); }
  }
  add('</g>');

  // eyes and brows
  const eyeY = 154, open = ch.eyeOpen || 1, iris = ch.eyes || '#5a3a22';
  for (const s of [-1, 1]) {
    const cx = 150 + s * 26, w = 13, h = 6.5 * open;
    const eye = `M${cx - w},${eyeY} C${cx - w * 0.5},${eyeY - h * 1.3} ${cx + w * 0.5},${eyeY - h * 1.35} ${cx + w},${eyeY - 1} C${cx + w * 0.5},${eyeY + h * 0.9} ${cx - w * 0.5},${eyeY + h * 0.95} ${cx - w},${eyeY}Z`;
    const ek = `${id}e${s}`; defs.push(`<clipPath id="${ek}"><path d="${eye}"/></clipPath>`);
    add(`<path d="${eye}" fill="${mix('#f2ece4', sh, 0.25)}"/><g clip-path="url(#${ek})">`);
    const ix = cx - s * 1.2;
    add(`<circle cx="${ix}" cy="${eyeY - 0.5}" r="6.6" fill="${grad([[0, mix(iris, '#fff', 0.35)], [0.6, iris], [1, mix(iris, '#000', 0.6)]], true)}"/><circle cx="${ix}" cy="${eyeY - 0.5}" r="2.9" fill="#0b0908"/>`);
    add(`<rect x="${cx - 16}" y="${eyeY - 12}" width="32" height="9" fill="${deep}" opacity=".35" ${blur(2)}/><circle cx="${ix - 2}" cy="${eyeY - 2.6}" r="1.3" fill="#fff" opacity=".95"/></g>`);
    add(`<path d="M${cx - w - 1},${eyeY + 0.5} C${cx - w * 0.5},${eyeY - h * 1.35} ${cx + w * 0.5},${eyeY - h * 1.4} ${cx + w + 1},${eyeY - 1.5}" stroke="${mix(hair, '#000', 0.5)}" stroke-width="${fem ? 2.8 : 2}" fill="none" stroke-linecap="round"/>`);
    if (fem) for (let k = 0; k < 6; k++) { const t = 0.35 + k * 0.12, x = cx - w + 2 * w * t; add(`<path d="M${x},${eyeY - h * 1.1 + Math.abs(t - 0.6) * 6} l${s * 1.5 + (t - 0.5) * 5},-3.5" stroke="#1a1210" stroke-width="1" opacity=".8"/>`); }
    add(`<path d="M${cx - w * 0.75},${eyeY - h * 1.3 - 5} C${cx - w * 0.2},${eyeY - h * 1.9 - 4} ${cx + w * 0.5},${eyeY - h * 1.8 - 4} ${cx + w * 0.9},${eyeY - h - 4}" stroke="${deep}" stroke-width="1.4" fill="none" opacity=".55" ${blur(0.6)}/>`);
    add(`<path d="M${cx - w * 0.6},${eyeY + h * 0.95} C${cx},${eyeY + h * 1.15} ${cx + w * 0.5},${eyeY + h * 0.9} ${cx + w * 0.85},${eyeY + 1.5}" stroke="${deep}" stroke-width="1.2" fill="none" opacity=".4"/>`);
    if (age > 0.45) add(`<path d="M${cx - w * 0.6},${eyeY + h + 5} C${cx},${eyeY + h + 8} ${cx + w * 0.5},${eyeY + h + 6} ${cx + w * 0.9},${eyeY + 3}" stroke="${deep}" stroke-width="1.4" fill="none" opacity=".35" ${blur(1)}/>`);
    const by = 136, bc = mix(hair, '#000', 0.2), bw = fem ? 4.2 : 6.5, X = (x) => 150 + s * x;
    add(`<path d="M${X(11)},${by + 3} C${X(22)},${by - 4} ${X(34)},${by - 5} ${X(44)},${by + 2} C${X(34)},${by - 1} ${X(22)},${by + 1} ${X(11)},${by + 3 + bw * 0.5}Z" fill="${bc}" stroke="${bc}" stroke-width="${bw * 0.5}" stroke-linejoin="round" ${blur(0.8)}/>`);
  }
  // nose and mouth
  add(`<path d="M155,150 C157,166 163,180 163,190 C163,196 158,199 154,197" fill="none" stroke="${deep}" stroke-width="1.6" opacity=".55" ${blur(1)}/>`);
  for (const s of [-1, 1]) add(`<path d="M${150 + s * 4},197 C${150 + s * 8},199 ${150 + s * 12},198 ${150 + s * 13},193" stroke="${deep}" stroke-width="2.4" fill="none" opacity=".7" ${blur(0.7)}/><ellipse cx="${150 + s * 8}" cy="196.5" rx="3" ry="1.6" fill="${mix(deep, '#000', 0.4)}" opacity=".7"/>`);
  const lip = ch.lip || mix(skin, '#9a3a36', 0.3), lipD = mix(lip, '#000', 0.22), mw = ch.mouthW || 17, my = 214;
  add(`<path d="M${150 - mw},${my} C${150 - mw * 0.6},${my - 5} 146,${my - 7} 150,${my - 4.5} C154,${my - 7} ${150 + mw * 0.6},${my - 5} ${150 + mw},${my} C${150 + mw * 0.5},${my + 1} ${150 - mw * 0.5},${my + 1} ${150 - mw},${my}Z" fill="${lipD}"/>`);
  add(`<path d="M${150 - mw},${my} C${150 - mw * 0.5},${my + 1} ${150 + mw * 0.5},${my + 1} ${150 + mw},${my} C${150 + mw * 0.6},${my + (fem ? 11 : 8)} ${150 - mw * 0.6},${my + (fem ? 11 : 8)} ${150 - mw},${my}Z" fill="${grad([[0, lip], [1, lipD]], false, 'x1="0" y1="0" x2="0" y2="1"')}"/>`);
  add(`<ellipse cx="146" cy="${my + 4}" rx="6" ry="1.6" fill="#fff" opacity=".25" ${blur(1)}/><path d="M${150 - mw - 1},${my} C${150 - mw * 0.5},${my + 2} ${150 + mw * 0.5},${my + 2} ${150 + mw + 1},${my}" stroke="${mix(lipD, '#000', 0.5)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);

  if (!FO) {
    // hair
    const hs = ch.hairStyle;
    let hd = '';
    if (hs === 'short') hd = `M${150 - W - 4},170 C${150 - W - 10},120 ${150 - W + 2},66 150,62 C${150 + W - 2},66 ${150 + W + 10},120 ${150 + W + 4},170 C${150 + W - 2},150 ${150 + W - 4},126 ${150 + W - 12},112 C170,104 140,104 ${150 - W + 12},116 C${150 - W + 4},130 ${150 - W + 2},150 ${150 - W - 4},170Z`;
    if (hs === 'bob' || hs === 'long') hd = `M${150 - W - 14},232 C${150 - W - 24},160 ${150 - W - 10},62 150,58 C${150 + W + 10},62 ${150 + W + 24},160 ${150 + W + 14},232 C${150 + W + 2},226 ${150 + W - 2},180 ${150 + W - 6},140 C${150 + W - 10},116 180,112 156,104 C130,118 ${150 - W + 8},122 ${150 - W + 4},140 C${150 - W + 2},180 ${150 - W - 2},226 ${150 - W - 14},232Z`;
    if (hs === 'sides') hd = `M${150 - W - 4},175 C${150 - W - 8},140 ${150 - W - 2},112 ${150 - W + 8},100 L${150 - W + 14},118 C${150 - W + 6},140 ${150 - W + 4},155 ${150 - W - 4},175Z M${150 + W + 4},175 C${150 + W + 8},140 ${150 + W + 2},112 ${150 + W - 8},100 L${150 + W - 14},118 C${150 + W - 6},140 ${150 + W - 4},155 ${150 + W + 4},175Z`;
    if (hd) {
      add(`<path d="${hd}" fill="${grad([[0, hairLt], [0.5, hair], [1, hairSh]], true, 'cx="35%" cy="25%" r="80%"')}"/>`);
      const hk = `${id}h`; defs.push(`<clipPath id="${hk}"><path d="${hd}"/></clipPath>`);
      add(`<g clip-path="url(#${hk})"><path d="M160,60 C${150 + W},90 ${150 + W + 10},160 ${150 + W + 20},240 L${150 + W + 40},240 L${150 + W + 40},60Z" fill="${hairSh}" opacity=".6" ${blur(8)}/>`);
      for (let i = 0; i < 60; i++) {
        const x0 = 150 - W - 14 + rnd() * (2 * W + 28), y0 = 58 + rnd() * 30, dir = x0 < 150 ? -1 : 1, len = 40 + rnd() * (hs === 'bob' || hs === 'long' ? 150 : 50);
        add(`<path d="M${x0},${y0} q${dir * 18},${len * 0.4} ${dir * (10 + rnd() * 14)},${len}" stroke="${rnd() < 0.5 ? hairLt : hairSh}" stroke-width="2.4" fill="none" opacity=".4"/>`);
      }
      add('</g>');
    }
    if (ch.hat) {
      const hc = ch.hat, hl = mix(hc, '#fff', 0.2), hdk = mix(hc, '#000', 0.4);
      add(`<g transform="translate(0,8)"><path d="M${150 - W - 50},108 C${150 - W - 40},92 ${150 + W + 40},86 ${150 + W + 52},102 C${150 + W + 30},116 ${150 - W - 30},122 ${150 - W - 50},108Z" fill="${grad([[0, hl], [1, hdk]], false)}"/>`);
      add(`<path d="M${150 - W + 4},104 C${150 - W + 2},66 116,40 150,42 C184,40 ${150 + W - 2},66 ${150 + W - 4},100 C170,96 130,96 ${150 - W + 4},104Z" fill="${grad([[0, hl], [0.6, hc], [1, hdk]], false, 'x1="0" y1="0" x2="1" y2="0"')}"/>`);
      add(`<path d="M150,44 C146,54 148,62 150,66" stroke="${hdk}" stroke-width="3" fill="none" opacity=".7"/><path d="M${150 - W + 4},104 C130,96 170,96 ${150 + W - 4},100 L${150 + W - 3},88 C170,84 130,84 ${150 - W + 3},92Z" fill="#1a1612"/>`);
      shade(`M${150 - W - 10},112 C130,128 180,128 ${150 + W + 10},110 L${150 + W + 10},128 C170,140 130,140 ${150 - W - 10},128Z`, '#000', 0.45, 6);
      add('</g>');
    }
    if (ch.glasses) {
      for (const s of [-1, 1]) add(`<rect x="${150 + s * 26 - 17}" y="${eyeY - 11}" width="34" height="22" rx="9" fill="none" stroke="${ch.glasses}" stroke-width="1.8"/>`);
      add(`<path d="M141,${eyeY - 4} Q150,${eyeY - 9} 159,${eyeY - 4}" stroke="${ch.glasses}" stroke-width="1.8" fill="none"/><path d="M112,${eyeY - 6} l8,-4" stroke="#fff" stroke-width="2" opacity=".5"/>`);
    }
  }

  // the painted finish: brushy edges, canvas grain, a dark vignette
  defs.push(`<filter id="${id}br" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="${ch.seed || 3}"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>`);
  let finish = '', fig = out.slice(figStart).join('');
  if (!FO) {
    defs.push(`<filter id="${id}vol" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="9" result="h"/><feDiffuseLighting in="h" surfaceScale="6" diffuseConstant="1.25" lighting-color="#ffe6c4" result="l"><feDistantLight azimuth="215" elevation="44"/></feDiffuseLighting><feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="1.05" result="lit"/><feComposite in="lit" in2="SourceAlpha" operator="in"/></filter>`);
    defs.push(`<filter id="${id}cv"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="2"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .55 0"/></filter>`);
    defs.push(`<filter id="${id}st"><feTurbulence type="fractalNoise" baseFrequency=".02 .25" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  0 0 0 .5 -.18"/></filter>`);
    finish = `<rect width="300" height="360" filter="url(#${id}cv)" opacity=".28" style="mix-blend-mode:multiply"/><rect width="300" height="360" filter="url(#${id}st)" opacity=".5" style="mix-blend-mode:soft-light"/><rect width="300" height="360" fill="${grad([[0.55, '#000', 0], [1, '#1a0e08', 0.6]], true)}"/>`;
    fig = `<g filter="url(#${id}vol)">${fig}</g>`;
  }
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${opts.vb || '22 26 256 307'}"${size}><defs>${defs.join('')}</defs><g filter="url(#${id}br)">${out.slice(0, figStart).join('')}${fig}</g>${finish}</svg>`;
}

// As an image URL, cached: an <img> is rasterised once, which is cheaper on a phone than live SVG.
const urls = new Map();
export function portraitURL(ch, vb) {
  const key = JSON.stringify([ch, vb || '']);
  if (!urls.has(key)) urls.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSVG(ch, { vb }))}`);
  return urls.get(key);
}
export const BUST = '22 26 256 307', FACE = '58 60 184 221', AVATAR = '86 96 128 128';

// The handler's messages on the phone, with the contact card on top (both kinds of case).
export function handlerHTML(msgs) {
  const av = portraitURL(HANDLER, AVATAR);
  return `<div class="contact"><img class="av" alt="" src="${portraitURL(HANDLER, BUST)}"><div><div class="n">Your handler</div><div class="s">● Secure line</div></div></div>`
    + msgs.map((m) => `<div class="msgrow"><img class="mini" alt="" src="${av}"><p class="msg">${m}</p></div>`).join('');
}
