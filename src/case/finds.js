// Case 02's collectibles: stray cats to pet and Florentine food and souvenirs to pick up, kept in an
// album on the phone. They never change the case. More strays come out as Heat rises: two at Heat 0
// and two more for every point. Rules only, no 3D or page code (findsview.js draws them).

// Eight coats; a play shows at most six, so meeting all of them takes a few plays (and some Heat).
// main: the body; second: patches, chest and paws; nose: the nose and inner ears.
export const CATS = [
  { id: 'rosso', name: 'Rosso', coat: 'a ginger tabby', main: '#d0782f', second: '#f0c08a', stripe: '#9a4e1c', nose: '#d98a8a' },
  { id: 'nerone', name: 'Nerone', coat: 'a black cat', main: '#1c1b1f', second: '#2a282e', stripe: null, nose: '#3a2a2e' },
  { id: 'neve', name: 'Neve', coat: 'a white cat', main: '#f2efe8', second: '#ffffff', stripe: null, nose: '#e6a0a8' },
  { id: 'grigio', name: 'Grigio', coat: 'a grey tabby', main: '#8a8a88', second: '#c9c7c0', stripe: '#4c4c4c', nose: '#c78a8a' },
  { id: 'arlecchina', name: 'Arlecchina', coat: 'a calico', main: '#f4efe4', second: '#d47a32', stripe: '#262222', nose: '#e0a0a0' },
  { id: 'frac', name: 'Frac', coat: 'a tuxedo cat', main: '#1e1e22', second: '#f4f1ea', stripe: null, nose: '#e09aa0' },
  { id: 'tartaruga', name: 'Tartaruga', coat: 'a tortoiseshell', main: '#3a2a20', second: '#b8652a', stripe: '#1c1410', nose: '#6a4a40' },
  { id: 'panna', name: 'Panna', coat: 'a cream cat', main: '#ecd3a8', second: '#f7ead0', stripe: '#d4b27a', nose: '#e0a0a0' },
];

// Things on stalls and counters around the slice, in the same spot every play.
export const ITEMS = [
  { id: 'caffe', kind: 'food', name: 'Espresso', at: [-188, 62], text: 'Taken standing at the bar near the Baptistery. Standing costs less than sitting down.' },
  { id: 'schiacciata', kind: 'food', name: 'Schiacciata', at: [-111, 190], text: 'Flat bread pressed with fingers, oily and salty, split and filled with salami at a counter on Via dei Calzaiuoli.' },
  { id: 'cantucci', kind: 'food', name: 'Cantucci', at: [-102, 345], text: 'Hard almond biscuits from nearby Prato, baked twice and made for dipping in vin santo.' },
  { id: 'lampredotto', kind: 'food', name: 'Lampredotto', at: [-144, 505], text: 'The Florentine street sandwich: the fourth stomach of a cow, slow-cooked, with green sauce, from a cart.' },
  { id: 'gelato', kind: 'food', name: 'Gelato', at: [-80, 617], text: 'A cup from a cart on the Lungarno. Florence likes to say Buontalenti made one for the Medici court.' },
  { id: 'ribollita', kind: 'food', name: 'Ribollita', at: [-178, 858], text: 'Bread and black cabbage soup, "boiled again" the next day, served in a trattoria by the Pitti.' },
  { id: 'carta', kind: 'souvenir', name: 'Marbled paper', at: [-96, 436], text: 'Colours floated on a bath and combed into swirls, then lifted onto a sheet: an old Florentine craft.' },
  { id: 'segnalibro', kind: 'souvenir', name: 'Leather bookmark', at: [-136, 568], text: 'Tooled and gilded by hand in a workshop off Via Por Santa Maria.' },
  { id: 'cartolina', kind: 'souvenir', name: 'Postcard', at: [-134, 682], text: 'Ponte Vecchio\'s shops. Since 1593, by a grand duke\'s order, only goldsmiths and jewellers trade on the bridge.' },
];

export const TOTAL = CATS.length + ITEMS.length;

// How many strays are out at this Heat.
export const catsFor = (heat) => Math.min(6, 2 + 2 * Math.max(0, heat));

// The album: the ids found so far, kept on the phone across plays.
const KEY = 'album';
export function loadAlbum(store = globalThis.localStorage) {
  try { return new Set(JSON.parse(store?.getItem(KEY) || '[]')); } catch { return new Set(); }
}
export function saveAlbum(album, store = globalThis.localStorage) {
  try { store?.setItem(KEY, JSON.stringify([...album])); } catch { /* private mode */ }
}
// Adds a find; true when it is new to the album.
export function collect(album, id) {
  if (album.has(id)) return false;
  album.add(id); return true;
}

// The coats this play, in the order they come out (shuffled each play).
export function catOrder(random = Math.random) {
  const a = CATS.map((c) => c.id);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, catsFor(99));
}
