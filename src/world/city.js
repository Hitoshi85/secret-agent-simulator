// Layout of the walkable slice of central Florence, in metres: x runs east, z runs south, y is up.
// Distances follow the real city loosely (shortened a little for the game): the Duomo in the north,
// Via dei Calzaiuoli down to Piazza della Signoria, Via Por Santa Maria to the Arno, Ponte Vecchio
// across it and the start of Oltrarno on the far bank.

// The area the nav grid and the city cover.
export const BOUNDS = { x0: -340, x1: 140, z0: -140, z1: 900 };

// Places the agent can walk. Axis-aligned rectangles [x0, z0, x1, z1].
export const WALK = [
  { name: 'Piazza del Duomo', r: [-205, -78, 125, 78] },
  { name: 'Via dei Calzaiuoli', r: [-113, 78, -100, 422] },
  { name: 'Piazza della Signoria', r: [-150, 420, -40, 521] },
  { name: 'Via Por Santa Maria', r: [-147, 521, -134, 614] },
  { name: 'Lungarno degli Archibusieri', r: [-320, 612, 120, 623] },
  { name: 'Ponte Vecchio', r: [-147, 623, -133, 713] },
  { name: 'Lungarno Torrigiani', r: [-320, 712, 120, 722] },
  { name: 'Via de\' Guicciardini', r: [-147, 722, -134, 820] },
  { name: 'Piazza de\' Pitti', r: [-200, 820, -60, 880] },
];

// The Arno between its embankments (not walkable, but the camera may hang over it).
export const RIVER = [-400, 623, 220, 712];

// Footprints of the landmarks inside walkable areas (blocked for walking).
export const LANDMARKS = {
  duomo: { at: [0, 0], block: [[-121, -40, 22, 40], [-36, -56, 52, 56]] }, // nave + crossing with the dome and tribunes
  campanile: { at: [-110, 44], block: [[-118, 36, -102, 52]] },
  baptistery: { at: [-165, 0], circle: 18 },
  palazzoVecchio: { at: [-12, 465], block: [[-40, 428, 16, 503]] },
  loggia: { at: [-62, 528], block: [[-80, 521, -44, 536]] },
  neptune: { at: [-58, 482], circle: 5 },
};

// Named places for the Map (jump there) and for the HUD's location label.
export const PLACES = [
  { id: 'duomo', name: 'Piazza del Duomo', at: [92, 60], face: [-0.83, -0.56], pitch: 0.16 },
  { id: 'calzaiuoli', name: 'Via dei Calzaiuoli', at: [-106, 250], face: [0, 1] },
  { id: 'signoria', name: 'Piazza della Signoria', at: [-128, 432], face: [0.85, 0.53], pitch: 0.15 },
  { id: 'ponte', name: 'Ponte Vecchio', at: [-200, 617], face: [0.9, 0.2] },
  { id: 'oltrarno', name: 'Oltrarno', at: [-140, 790], face: [0, -1] },
];

export const START = { at: [92, 60], face: [-0.83, -0.56], pitch: 0.16 };

// The walk area name at a point (the HUD shows it), or null.
export function areaAt(x, z) {
  for (const a of WALK) { const [x0, z0, x1, z1] = a.r; if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return a.name; }
  return null;
}
