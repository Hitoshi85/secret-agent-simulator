// The case rules, shared by every case and free of 3D and page code (so tests can run them directly).
// A case file (src/cases/*.js) gives the traits, clues and places; this picks the thief at random,
// makes decoy suspects that each differ from the thief in exactly one trait (so every firm clue
// rules some out and the case can always be solved), and keeps the notebook, Heat and outcome.

const shuffle = (a, random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, random) => a[Math.floor(random() * a.length)];

export function newCase(def, random = Math.random) {
  const names = Object.keys(def.traits);
  const thief = Object.fromEntries(names.map((t) => [t, pick(def.traits[t], random).id]));
  // Every one-trait variation of the thief, shuffled; take one per trait first, then fill up.
  const variants = shuffle(names.flatMap((t) => def.traits[t].filter((v) => v.id !== thief[t]).map((v) => ({ ...thief, [t]: v.id, _t: t }))), random);
  const decoys = [];
  for (const t of names) { const v = variants.find((x) => x._t === t && !decoys.includes(x)); if (v) decoys.push(v); }
  for (const v of variants) if (decoys.length < def.suspects - 1 && !decoys.includes(v)) decoys.push(v);
  const people = shuffle([thief, ...decoys.slice(0, def.suspects - 1)], random);
  const haunts = shuffle([...def.haunts], random);
  const suspects = people.map((p, i) => {
    const traits = Object.fromEntries(names.map((t) => [t, p[t]]));
    return { id: i, traits, haunt: haunts[i % haunts.length], out: false, thief: p === thief };
  });
  return {
    def, suspects, thief: suspects.findIndex((s) => s.thief),
    found: [], notes: [], heat: 0, status: 'open', // open, won or lost
    tries: Object.fromEntries(def.clues.filter((c) => c.pattern).map((c) => [c.id, c.tries])),
    picked: [], // gadget clues picked up but not cracked yet
  };
}

export const traitValue = (def, t, id) => def.traits[t].find((v) => v.id === id);
// "Green coat, leather bag, no hat"
export function describe(def, s) {
  const parts = Object.keys(def.traits).map((t) => traitValue(def, t, s.traits[t]).name);
  return parts[0] + (parts.length > 1 ? ', ' + parts.slice(1).join(', ') : '');
}
// The look of a suspect for makeFigure: the traits' looks over a plain base.
export function suspectLook(def, s) {
  return Object.assign({ skirt: false, longHair: false, coat: false, bag: null, hat: null },
    ...Object.keys(def.traits).map((t) => traitValue(def, t, s.traits[t]).look));
}

const thiefOf = (c) => c.suspects[c.thief];

// Records a clue as found and returns what to show. Firm clues cross out the suspects they rule out.
export function learn(c, id) {
  const clue = c.def.clues.find((k) => k.id === id);
  if (!clue || c.status !== 'open') return null;
  const v = clue.trait ? thiefOf(c).traits[clue.trait] : null;
  const fresh = !c.found.includes(id);
  if (fresh) {
    c.found.push(id); c.notes.push(clue.note(v));
    if (clue.firm) for (const s of c.suspects) if (s.traits[clue.trait] !== v) s.out = true;
  }
  return { clue, fresh, text: clue.found ? clue.found(v) : clue.says(v) };
}

// The first time the player finds a gadget clue they pick it up; it is learned once cracked.
export function pickUp(c, id) {
  if (!c.picked.includes(id) && !c.found.includes(id)) c.picked.push(id);
  return c.def.clues.find((k) => k.id === id);
}

// One unlock attempt on a picked-up gadget clue: 'open', 'wrong' (tries left) or 'locked'.
export function crack(c, id, order) {
  const clue = c.def.clues.find((k) => k.id === id);
  if (!clue || !c.picked.includes(id) || c.tries[id] <= 0) return 'locked';
  if (order.length === clue.pattern.length && order.every((d, i) => d === clue.pattern[i])) {
    c.picked = c.picked.filter((k) => k !== id); learn(c, id); return 'open';
  }
  c.tries[id]--;
  if (c.tries[id] <= 0) { c.picked = c.picked.filter((k) => k !== id); return 'locked'; }
  return 'wrong';
}

// Accuses a suspect: 'right' wins the case; 'wrong' adds Heat; 'lost' when Heat is full.
export function accuse(c, i) {
  if (c.status !== 'open') return c.status;
  if (i === c.thief) { c.status = 'won'; return 'right'; }
  c.heat++; c.suspects[i].out = true;
  if (c.heat >= c.def.maxHeat) { c.status = 'lost'; return 'lost'; }
  return 'wrong';
}
