// Every case in the game. Each is its own data file; the engine in src/case/ runs whichever is chosen
// (the first one, or ?case=<id> in the address).
import dossier from './dossier.js';

export const CASES = [dossier];
export const pickCase = (id) => CASES.find((c) => c.id === id) || CASES[0];
