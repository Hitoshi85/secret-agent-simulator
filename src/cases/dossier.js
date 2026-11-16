// Case 01, The Dossier: a courier's dossier was lifted at a café under the Loggia. Five suspects
// stroll the centre and one of them, picked at random each play, has it. Each case is its own data
// file like this one; the shared engine in src/case/ runs it. To add a case, copy this file, change
// the text, traits, people and places, and list it in src/cases/index.js.
export default {
  id: 'dossier',
  number: '01',
  title: 'The Dossier',
  time: '17:40',
  train: '19:10',
  briefing: [
    'At 17:05 a courier set a grey dossier down at a café table under the Loggia. When she looked up, it was gone.',
    'Whoever took it is still in the centre and will leave on the 19:10 from Santa Maria Novella.',
    '<b>Your job:</b> find who took it and get it back, quietly.',
  ],
  // The handler's first lead, on the Phone when you take the case.
  handler: [
    'Start at the Duomo. A flower seller works the east end of the piazza and sees everyone who comes up from the Loggia.',
    'Then the Signoria. Our courier says a painter sets up by the palazzo every afternoon.',
  ],
  tasks: ['Talk to witnesses around the city', 'Look for traces they left', 'Accuse in the crowd. Each wrong guess raises Heat'],

  // What tells the suspects apart. Each value says how it looks on a person (see randomLook).
  traits: {
    coat: [
      { id: 'green', name: 'Green coat', look: { coat: true, top: '#3f7a4a' } },
      { id: 'navy', name: 'Navy coat', look: { coat: true, top: '#24365c' } },
      { id: 'red', name: 'Red coat', look: { coat: true, top: '#9c2f2a' } },
      { id: 'camel', name: 'Camel coat', look: { coat: true, top: '#c8a878' } },
    ],
    bag: [
      { id: 'bag', name: 'leather bag', look: { bag: '#6b3a1e' } },
      { id: 'nobag', name: 'no bag', look: { bag: null } },
    ],
    hat: [
      { id: 'hat', name: 'hat', look: { hat: '#2e2a26' } },
      { id: 'nohat', name: 'no hat', look: { hat: null } },
    ],
  },
  suspects: 5,
  maxHeat: 3, // wrong accusations before the thief runs for the train
  // Where suspects stroll (a point and how far they wander from it), and the name the notebook uses.
  haunts: [
    { name: 'Duomo', at: [40, 60], range: 30 },
    { name: 'Calzaiuoli', at: [-106, 200], range: 40 },
    { name: 'Signoria', at: [-95, 470], range: 30 },
    { name: 'Por Santa Maria', at: [-140, 570], range: 25 },
    { name: 'Ponte Vecchio', at: [-140, 668], range: 25 },
  ],

  // Clues. A witness speaks, a trace is picked up, a gadget clue needs the phone puzzle solved.
  // `trait` is what the clue gives away about the thief; `firm` ones cross suspects out by themselves,
  // vague ones are left for the player to weigh. `says` and `note` are keyed by the thief's value.
  clues: [
    {
      id: 'flowers', kind: 'witness', who: 'Flower seller', at: [62, 70], face: [1, 0], trait: 'coat', firm: false,
      look: { top: '#c46a3a', bottom: '#5a4a3a', skirt: true, longHair: true, bag: null },
      says: (v) => `“Someone hurried past towards Calzaiuoli with a grey folder. ${({ green: 'Something green', navy: 'Something dark blue', red: 'Something red', camel: 'Something light brown' })[v]}, I think? It was busy.”`,
      note: (v) => `Flower seller: “${({ green: 'something green', navy: 'something dark blue', red: 'something red', camel: 'something light brown' })[v]}, I think”`,
    },
    {
      id: 'painter', kind: 'witness', who: 'Street painter', at: [-118, 445], face: [1, 0.3], trait: 'bag', firm: true,
      look: { top: '#e8e2d4', bottom: '#3a3a3a', skirt: false, hat: '#7a5a3a', bag: null },
      says: (v) => v === 'bag'
        ? '“Someone walked off fast towards the river with a grey folder, and a <b>leather bag</b> on the shoulder.”'
        : '“Someone walked off fast towards the river with a grey folder under their arm. <b>No bag</b>, I’m sure of that.”',
      note: (v) => `Painter: ${v === 'bag' ? 'leather bag' : 'no bag'}, went towards the river`,
    },
    {
      id: 'jeweller', kind: 'witness', who: 'Jeweller’s apprentice', at: [-136, 640], face: [-1, 0], trait: 'hat', firm: true,
      look: { top: '#1f3550', bottom: '#2b2f3a', skirt: false, bag: null },
      says: (v) => v === 'hat'
        ? '“A grey folder? Yes, someone in a <b>hat</b> stopped at our window and looked back twice.”'
        : '“A grey folder? Yes. <b>No hat</b>, I noticed the hair, and they kept looking back.”',
      note: (v) => `Jeweller’s apprentice: ${v === 'hat' ? 'wore a hat' : 'no hat'}`,
    },
    {
      id: 'receipt', kind: 'trace', what: 'Café receipt', at: [-62, 516],
      says: () => 'A café receipt under the Loggia: <b>two espressos, 17:02, paid in cash</b>. The thief sat down first and waited.',
      note: () => 'Café receipt: 2 espressos, 17:02, paid in cash',
    },
    {
      id: 'phone', kind: 'gadget', what: 'Dropped phone', at: [-140, 590], trait: 'coat', firm: true,
      // The unlock pattern on a 3 x 3 grid (0 is top left, 8 bottom right). The smudges show these
      // dots; the order starts top left and each step goes to a neighbour.
      pattern: [0, 1, 4, 5, 8], tries: 3,
      says: () => 'A phone lies by the wall, screen cracked and locked. Open your <b>Phone</b> to crack it.',
      found: (v) => `“Platform 7, 19:10. Lose the ${({ green: 'green', navy: 'navy', red: 'red', camel: 'camel' })[v]} coat before the station.”`,
      note: (v) => `Dropped phone: “lose the ${({ green: 'green', navy: 'navy', red: 'red', camel: 'camel' })[v]} coat”`,
    },
  ],
};
