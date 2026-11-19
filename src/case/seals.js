// The rules of a seal case (Case 02 and any like it), free of 3D and page code. Each play the case's
// subjects are dealt to landmarks at random and a hidden word is picked; every seal holds one
// question, made fresh when you first open it, and breaking it reveals the letter in its slot. Seals
// can be broken in any order. Wrong answers and wrong guesses add Heat. Once `guessAt` seals are
// broken you may guess the word; all of them reveal it. Then walk to the word's place to win.
import { makeQuestion, isRight, shuffle } from './quiz.js';

export function newSealCase(def, random = Math.random, seen = new Set()) {
  const sites = shuffle([...def.sites], random);
  const word = def.words[Math.floor(random() * def.words.length)];
  const slots = shuffle([...Array(def.subjects.length).keys()], random);
  const seals = def.subjects.map((s, i) => ({ id: s.id, subject: s, site: sites[i], slot: slots[i], letter: word.word[slots[i]], q: null, broken: false, tries: 0 }));
  return { def, random, seals, word, seen, heat: 0, status: 'open', known: false, clock: 0, hinted: [] }; // status: open, won or lost
}

export const brokenCount = (c) => c.seals.filter((s) => s.broken).length;
export const canGuess = (c) => c.status === 'open' && !c.known && brokenCount(c) >= c.def.guessAt;

// The seal's question, made the first time it is opened.
export function openSeal(c, id) {
  const s = c.seals.find((x) => x.id === id);
  if (!s) return null;
  if (!s.q) s.q = makeQuestion(s.subject, c.random, c.seen);
  return s;
}

function addHeat(c) { c.heat++; if (c.heat >= c.def.maxHeat) c.status = 'lost'; }

// One answer: 'right', 'wrong', 'lost', or null when the seal can't be answered.
export function answer(c, id, value) {
  const s = c.seals.find((x) => x.id === id);
  if (!s || !s.q || s.broken || c.status !== 'open') return null;
  s.tries++;
  if (!isRight(s.q, value)) { addHeat(c); return c.status === 'lost' ? 'lost' : 'wrong'; }
  s.broken = true; c.seen.add(s.q.id);
  if (brokenCount(c) === c.seals.length) c.known = true;
  return 'right';
}

// The hidden word with the letters found so far ('C _ _ _ L _' as an array, '' for unknown).
export const letters = (c) => [...c.word.word].map((ch, i) => (c.known || c.seals.some((s) => s.broken && s.slot === i) ? ch : ''));

// A guess at the word: 'right', 'wrong', 'lost', or 'locked' before enough seals are broken.
export function guess(c, w) {
  if (!canGuess(c)) return 'locked';
  if (String(w).toUpperCase().replace(/[^A-Z]/g, '') === c.word.word) { c.known = true; return 'right'; }
  addHeat(c); return c.status === 'lost' ? 'lost' : 'wrong';
}

// Reaching the word's place once it is known wins the case.
export function claim(c) { if (c.status === 'open' && c.known) c.status = 'won'; return c.status; }
