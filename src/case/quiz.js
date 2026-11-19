// Questions for seal cases, free of 3D and page code. Engineering questions and ciphers are built
// from random values, so they are new every play; orderings and pairs are random draws from banks;
// fact questions come from a bank with a few more wrong answers than are shown, so a fact that comes
// back looks different. Every question has an `id` (the game remembers the ones you have seen), a
// `format` the view knows how to show, its `answer`, a `hint` and an `explain`.

const int = (a, b, random) => a + Math.floor(random() * (b - a + 1));
const pick = (a, random) => a[Math.floor(random() * a.length)];
export const shuffle = (a, random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (n) => String(Math.round(n * 100) / 100);

// ---- Mechanical engineering (number answers) ----
const gearWheel = (r) => {
  const p1 = pick([6, 8, 10, 12], r), k1 = int(2, 4, r), p2 = pick([8, 10, 12], r), k2 = int(2, 5, r);
  const w1 = p1 * k1, w2 = p2 * k2, R = k1 * k2;
  return { id: `gear:${p1}-${w1}-${p2}-${w2}`, format: 'number', unit: 'teeth', answer: w2, title: 'The missing wheel',
    prompt: `A clock train: a <b>${p1}</b>-tooth pinion drives a <b>${w1}</b>-tooth wheel; on that wheel's shaft a <b>${p2}</b>-tooth pinion drives the last wheel. The last wheel must turn once for every <b>${R}</b> turns of the first pinion. How many teeth must it have?`,
    hint: 'Each pair slows the turning by (driven teeth ÷ driving teeth). The two ratios multiply.',
    explain: `${w1} ÷ ${p1} = ${k1}, so the last pair must give ${R} ÷ ${k1} = ${k2}: ${p2} × ${k2} = ${w2} teeth.`,
    figure: { kind: 'gears', teeth: [p1, w1, p2, '?'] } };
};
const gearSpeed = (r) => {
  const a = pick([10, 12, 15, 20], r), k = int(2, 5, r), b = a * k, rpm = k * int(6, 40, r);
  return { id: `rpm:${a}-${b}-${rpm}`, format: 'number', unit: 'rpm', answer: rpm / k, title: 'The mill wheel',
    prompt: `A <b>${a}</b>-tooth gear turning at <b>${rpm} rpm</b> drives a <b>${b}</b>-tooth gear. How fast does the big gear turn?`,
    hint: 'Teeth passing per minute are the same on both gears: teeth × rpm is equal.',
    explain: `${a} × ${rpm} = ${b} × speed, so the speed is ${fmt(rpm / k)} rpm.`, figure: { kind: 'gears', teeth: [a, b] } };
};
const lever = (r) => {
  const dL = int(1, 3, r) * 0.5, dE = dL * int(2, 6, r), F = int(4, 30, r) * 10, W = F * dE / dL;
  return { id: `lever:${dL}-${dE}-${F}`, format: 'number', unit: 'N', answer: F, title: 'The guild lever',
    prompt: `A stone weighing <b>${W} N</b> sits <b>${fmt(dL)} m</b> from a lever's pivot. You push down <b>${fmt(dE)} m</b> from the pivot on the other side. What force just balances it?`,
    hint: 'Moments balance: force × distance is the same on both sides of the pivot.',
    explain: `${W} × ${fmt(dL)} = force × ${fmt(dE)}, so the force is ${F} N.` };
};
const pulley = (r) => {
  const n = int(2, 6, r), E = int(5, 40, r) * 10, W = E * n, ask = r() < 0.5;
  return { id: `pulley:${n}-${E}-${ask ? 'f' : 'd'}`, format: 'number', unit: ask ? 'N' : 'm', answer: ask ? E : 2 * n, title: 'The hoist',
    prompt: ask
      ? `A block and tackle holds a <b>${W} N</b> load on <b>${n}</b> supporting ropes. Ignoring friction, what pull on the free end holds it?`
      : `A block and tackle has <b>${n}</b> ropes supporting the load. How far must you pull the free end to raise the load by <b>2 m</b>?`,
    hint: 'Each supporting rope carries an equal share; and every rope must shorten by the lift.',
    explain: ask ? `${W} ÷ ${n} = ${E} N.` : `${n} ropes × 2 m = ${2 * n} m of rope.` };
};

// ---- Electrical engineering ----
const seriesResistor = (r) => {
  const I = pick([0.5, 1, 1.5, 2, 3], r);
  const Rt = pick([4, 6, 8, 12, 16, 24].filter((x) => Number.isInteger(I * x)), r), V = I * Rt, Rb = int(1, Rt - 1, r);
  return { id: `ohm:${V}-${I}-${Rb}`, format: 'number', unit: 'Ω', answer: Rt - Rb, title: 'The lantern fuse',
    prompt: `A lamp of <b>${Rb} Ω</b> runs from a <b>${V} V</b> battery. The current must be exactly <b>${fmt(I)} A</b>. What resistor goes in series with it?`,
    hint: 'Ohm\'s law: total resistance = voltage ÷ current. Series resistances add.',
    explain: `${V} V ÷ ${fmt(I)} A = ${Rt} Ω in total, minus the ${Rb} Ω lamp: ${Rt - Rb} Ω.` };
};
const power = (r) => {
  const V = pick([12, 24, 120, 230], r), I = int(1, 20, r) / 2, P = V * I;
  return { id: `power:${V}-${I}`, format: 'number', unit: 'A', answer: I, title: 'The workshop heater',
    prompt: `A heater is rated <b>${fmt(P)} W</b> on a <b>${V} V</b> supply. What current does it draw?`,
    hint: 'Power = voltage × current.', explain: `${fmt(P)} W ÷ ${V} V = ${fmt(I)} A.` };
};
const parallel = (r) => {
  const [a, b, c] = pick([[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [6, 6, 3], [5, 20, 4], [8, 8, 4], [12, 12, 6]], r), k = pick([1, 2, 5, 10], r);
  return { id: `par:${a * k}-${b * k}`, format: 'number', unit: 'Ω', answer: c * k, title: 'Two coils side by side',
    prompt: `Resistors of <b>${a * k} Ω</b> and <b>${b * k} Ω</b> are connected in parallel. What is their combined resistance?`,
    hint: 'For two in parallel: product ÷ sum.', explain: `(${a * k} × ${b * k}) ÷ (${a * k} + ${b * k}) = ${c * k} Ω.` };
};
// Control logic: three switches, an Open lamp and an Alarm lamp. Exactly one setting lights Open alone.
export const GATES = { AND: (x, y) => x & y, OR: (x, y) => x | y, XOR: (x, y) => x ^ y, NAND: (x, y) => 1 - (x & y), NOR: (x, y) => 1 - (x | y) };
export function lamps(c, s) {
  const v = (i, n) => (n ? 1 - s[i] : s[i]);
  const first = GATES[c.g1](s[0], s[1]);
  return { open: GATES[c.g2](first, v(2, c.notC)), alarm: GATES[c.g3](v(c.a[0], c.na[0]), v(c.a[1], c.na[1])) };
}
const logic = (r) => {
  for (;;) {
    const names = Object.keys(GATES);
    const c = { g1: pick(names, r), g2: pick(['AND', 'NOR', 'AND'], r), notC: r() < 0.4 ? 1 : 0, g3: pick(['AND', 'AND', 'NOR'], r), a: shuffle([0, 1, 2], r).slice(0, 2), na: [r() < 0.3 ? 1 : 0, r() < 0.3 ? 1 : 0] };
    const good = [];
    for (let k = 0; k < 8; k++) { const s = [(k >> 2) & 1, (k >> 1) & 1, k & 1]; const l = lamps(c, s); if (l.open && !l.alarm) good.push(s); }
    if (good.length !== 1) continue;
    const sw = good[0];
    return { id: `logic:${c.g1}-${c.g2}-${c.notC}-${c.g3}-${c.a}-${c.na}`, format: 'switches', answer: sw, circuit: c, title: 'The goldsmith\'s strongbox',
      prompt: 'The box opens when the <b>Open</b> lamp is lit, but if <b>Alarm</b> lights too, the rivals are told. Set the three switches.',
      hint: 'AND needs both inputs on; OR either; XOR exactly one; NAND and NOR are the opposite of AND and OR. A small circle means NOT.',
      explain: `Only A ${sw[0] ? 'on' : 'off'}, B ${sw[1] ? 'on' : 'off'}, C ${sw[2] ? 'on' : 'off'} lights Open without the Alarm.` };
  }
};

// ---- Ciphers (text answers) ----
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MORSE = '.- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --..'.split(' ');
export const caesar = (w, k) => [...w].map((ch) => A[(A.indexOf(ch) + k + 26) % 26]).join('');
const cipher = (words) => (r) => {
  const word = pick(words, r), kind = pick(['caesar', 'caesar', 'atbash', 'number', 'morse'], r), k = int(1, 25, r);
  const base = { id: `cipher:${kind}:${word}${kind === 'caesar' ? ':' + k : ''}`, format: 'text', answer: word, title: 'The coded rim' };
  if (kind === 'caesar') return { ...base, cipher: caesar(word, k),
    prompt: `Scratched on the stone, in the cipher a Roman general used for his letters: every letter moved <b>${k}</b> places on along the alphabet. Decode it.`,
    hint: `Move each letter ${k} places back (A comes after Z).`, explain: `Shifting back ${k} gives ${word}.` };
  if (kind === 'atbash') return { ...base, cipher: [...word].map((ch) => A[25 - A.indexOf(ch)]).join(''),
    prompt: 'An old mirror cipher, first used in Hebrew scripture: the alphabet folded in half, so A is Z, B is Y, and so on. Decode it.',
    hint: 'Each letter swaps with the one at the same distance from the other end.', explain: `Folding the alphabet gives ${word}.` };
  if (kind === 'number') return { ...base, cipher: [...word].map((ch) => A.indexOf(ch) + 1).join('·'),
    prompt: 'A field code from a dispatch case: each number is a letter\'s place in the alphabet. Decode it.',
    hint: 'A = 1, M = 13, Z = 26.', explain: `The numbers spell ${word}.` };
  return { ...base, cipher: [...word].map((ch) => MORSE[A.indexOf(ch)].replaceAll('.', '·').replaceAll('-', '−')).join('   '),
    prompt: 'Tapped out like a telegraph, in the dot-and-dash code that ran armies\' wires from the 1850s. Decode it.',
    hint: 'Letters are split by wide gaps. E is · and T is −. A is ·− and N is −·. S is ··· and O is −−−.', explain: `The taps spell ${word}.`,};
};

// ---- Banks: orderings, pairs, facts ----
// Put in order: five events at least `gap` years apart, drawn from a bank of [year, text].
const ordering = (bank, gap = 8) => (r) => {
  for (;;) {
    const set = shuffle([...bank], r).slice(0, 5);
    const ys = set.map((e) => e[0]).sort((a, b) => a - b);
    if (ys.some((y, i) => i && y - ys[i - 1] < gap)) continue;
    const sorted = [...set].sort((a, b) => a[0] - b[0]);
    return { id: `order:${ys.join('-')}`, format: 'order', title: 'The bronze calendar', items: set.map((e) => e[1]), answer: sorted.map((e) => e[1]),
      prompt: 'The guild scratched five events into the stone. Put them in order, earliest at the top.',
      hint: `The earliest is ${sorted[0][1].toLowerCase()}.`, explain: sorted.map((e) => `${e[0] < 0 ? -e[0] + ' BC' : e[0]}: ${e[1]}`).join('<br>') };
  }
};
// Match pairs: four [left, right] pairs from a bank, with no left or right used twice.
const matching = (bank, title, prompt) => (r) => {
  const set = []; for (const p of shuffle([...bank], r)) if (set.length < 4 && !set.some((q) => q[0] === p[0] || q[1] === p[1])) set.push(p);
  return { id: `match:${set.map((p) => p[0]).sort().join('|')}`, format: 'match', title, prompt, left: set.map((p) => p[0]),
    right: shuffle(set.map((p) => p[1]), r), answer: Object.fromEntries(set), hint: `${set[0][0]}: ${set[0][1]}.`,
    explain: set.map((p) => `${p[0]}: ${p[1]}`).join('<br>') };
};
// Multiple choice from a fact: { id, q, a, wrong: [4 or more], why }. Three wrong answers are drawn each time.
const choice = (bank) => (r, seen) => {
  const fresh = bank.filter((f) => !seen.has('fact:' + f.id));
  const f = pick(fresh.length ? fresh : bank, r);
  const options = shuffle([f.a, ...shuffle([...f.wrong], r).slice(0, 3)], r);
  return { id: 'fact:' + f.id, format: 'choice', title: f.title || 'The guild\'s question', prompt: f.q, options, answer: options.indexOf(f.a),
    hint: f.hint || 'Rule out the answers from the wrong century first.', explain: f.why };
};

// A question for a subject: one of its makers at random, avoiding ids already seen when it can.
export function makeQuestion(subject, random = Math.random, seen = new Set()) {
  let q;
  for (let i = 0; i < 30; i++) { q = pick(subject.makers, random)(random, seen); if (!seen.has(q.id)) break; }
  return { ...q, subject: subject.id };
}

// Is this the right answer? choice: option index; number: a number or text; text: letters;
// order: the items in order; match: { left: right }; switches: [0/1, 0/1, 0/1].
export function isRight(q, v) {
  switch (q.format) {
    case 'choice': return Number(v) === q.answer;
    case 'number': return Math.abs(Number(String(v).replace(',', '.')) - q.answer) < 0.011;
    case 'text': return String(v).toUpperCase().replace(/[^A-Z]/g, '') === q.answer;
    case 'order': return Array.isArray(v) && v.length === q.answer.length && v.every((x, i) => x === q.answer[i]);
    case 'match': return !!v && q.left.every((l) => v[l] === q.answer[l]);
    case 'switches': { const l = lamps(q.circuit, v.map(Number)); return !!(l.open && !l.alarm); }
  }
  return false;
}

export const MAKERS = { gearWheel, gearSpeed, lever, pulley, seriesResistor, power, parallel, logic, cipher, ordering, matching, choice };
