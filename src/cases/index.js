// Every case in the game. Each is its own data file; the engine in src/case/ runs whichever is chosen
// (the default, Case 02 The Compass Ledger, or ?case=<id> in the address, e.g. ?case=dossier for Case 01).
import dossier from './dossier.js';
import compass from './compass.js';

export const CASES = [dossier, compass];
export const DEFAULT_CASE = 'compass';
export const pickCase = (id) => CASES.find((c) => c.id === id) || CASES.find((c) => c.id === DEFAULT_CASE);
