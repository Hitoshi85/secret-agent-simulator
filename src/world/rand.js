// Seeded random numbers, so the city and its crowds look the same on every load (and in tests).
let seed = 7;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const pick = (a) => a[Math.floor(rnd() * a.length)];
export const reseed = (s) => { seed = s; };
