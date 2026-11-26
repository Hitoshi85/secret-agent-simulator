// The rules of a seal case (Case 02 and any like it), free of 3D and page code. Each play the case's
// subjects are dealt to landmarks at random and a hidden word not played before is picked; every seal holds one
// question, made fresh when you first open it, and breaking it reveals the letter in its slot. Seals
// can be broken in any order. Wrong answers and wrong guesses add Heat. Once `guessAt` seals are
// broken you may guess the word; all of them reveal it. Then walk to the word's place to win.
import { makeQuestion, isRight, isComplete, shuffle } from './quiz.js';

export function newSealCase(def, random = Math.random, seen = new Set()) {
  const sites = shuffle([...def.sites], random);
  const word = pickWord(def, random, seen);
  const slots = shuffle([...Array(def.subjects.length).keys()], random);
  const seals = def.subjects.map((s, i) => ({ id: s.id, subject: s, site: sites[i], slot: slots[i], letter: word.word[slots[i]], q: null, broken: false, tries: 0, wrong: [], struck: [], called: [] }));
  return { def, random, seals, word, seen, heat: 0, status: 'open', known: false, clock: 0, hinted: [], calls: def.calls ?? 2 }; // status: open, won or lost
}

// The hidden word: one not played yet on this phone (kept in `seen` as 'word:CUPOLA'), with one letter
// per seal. Once every word has been played the list starts over, never with the word just played.
export function pickWord(def, random = Math.random, seen = new Set()) {
  const all = def.words.filter((w) => w.word.length === def.subjects.length);
  let fresh = all.filter((w) => !seen.has('word:' + w.word));
  if (!fresh.length) {
    const last = [...seen].filter((id) => String(id).startsWith('word:')).pop();
    for (const w of all) seen.delete('word:' + w.word);
    fresh = all.filter((w) => 'word:' + w.word !== last);
  }
  const word = fresh[Math.floor(random() * fresh.length)];
  seen.add('word:' + word.word);
  return word;
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

// One answer: 'right', 'wrong', 'lost', 'incomplete' (no Heat), or null when the seal can't be answered.
// Wrong multiple-choice picks stay on the seal, so picking one again costs nothing.
export function answer(c, id, value) {
  const s = c.seals.find((x) => x.id === id);
  if (!s || !s.q || s.broken || c.status !== 'open') return null;
  if (!isComplete(s.q, value) || (s.q.format === 'choice' && (s.wrong.includes(Number(value)) || s.struck.includes(Number(value))))) return 'incomplete';
  s.tries++;
  if (!isRight(s.q, value)) { if (s.q.format === 'choice') s.wrong.push(Number(value)); addHeat(c); return c.status === 'lost' ? 'lost' : 'wrong'; }
  s.broken = true; c.seen.add(s.q.id);
  if (brokenCount(c) === c.seals.length) c.known = true;
  return 'right';
}

// The hidden word with the letters found so far ('C _ _ _ L _' as an array, '' for unknown).
export const letters = (c) => [...c.word.word].map((ch, i) => (c.known || c.seals.some((s) => s.broken && s.slot === i) ? ch : ''));

// A guess at the word: 'right', 'wrong', 'lost', 'incomplete' (gaps left, no Heat), or 'locked' before
// enough seals are broken.
export function guess(c, w) {
  if (!canGuess(c)) return 'locked';
  if (String(w).replace(/[^A-Za-z]/g, '').length !== c.word.word.length) return 'incomplete';
  if (String(w).toUpperCase().replace(/[^A-Z]/g, '') === c.word.word) { c.known = true; return 'right'; }
  addHeat(c); return c.status === 'lost' ? 'lost' : 'wrong';
}

// Reaching the word's place once it is known wins the case.
export function claim(c) { if (c.status === 'open' && c.known) c.status = 'won'; return c.status; }

// Phone a friend: each friend knows some subjects (and some question formats, such as ciphers). An expert
// talks you through the seal (`call`) and, on multiple choice, rules out two wrong answers; anyone else
// only gives the short hint. Every call uses one of the case's calls. Returns the call, or null.
export const knows = (f, s) => f.subjects.includes(s.subject.id) || (!!s.q && (f.formats || []).includes(s.q.format));
export function phone(c, id, friendId) {
  const s = c.seals.find((x) => x.id === id), f = (c.def.friends || []).find((x) => x.id === friendId);
  if (!s || !s.q || s.broken || !f || c.status !== 'open' || c.calls <= 0) return null;
  c.calls--;
  const expert = knows(f, s), call = { friend: f.id, expert, text: expert ? s.q.call : s.q.hint };
  if (expert && s.q.strike) for (const i of s.q.strike) if (!s.struck.includes(i)) s.struck.push(i);
  s.called.push(call);
  return call;
}
