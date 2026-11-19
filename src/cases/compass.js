// Case 02, The Compass Ledger: a fictional guild of engineers hid its ledger behind six seals, one per
// subject. Rules in src/case/seals.js, questions in src/case/quiz.js; here: story, places, words, banks.
import { MAKERS } from '../case/quiz.js';
import { FACTS } from './compass-facts.js';

const { gearWheel, gearSpeed, lever, pulley, seriesResistor, power, parallel, logic, cipher, ordering, matching, choice } = MAKERS;

// [year, event]; BC years are negative. Any five at least 8 years apart make an ordering question.
const EVENTS = [
  [-776, 'The first recorded Olympic Games'], [-490, 'The Battle of Marathon'], [-221, 'Qin Shi Huang unifies China'],
  [-27, 'Augustus becomes the first Roman emperor'], [313, 'The Edict of Milan tolerates Christianity'], [622, 'Muhammad\'s journey to Medina, the Hijra'],
  [1066, 'The Norman conquest of England'], [1206, 'Genghis Khan is proclaimed ruler of the Mongols'], [1271, 'Marco Polo sets out for China'],
  [1348, 'The Black Death reaches Florence'], [1397, 'The Medici Bank is founded in Florence'], [1453, 'Constantinople falls to the Ottomans'],
  [1498, 'Vasco da Gama reaches India by sea'], [1517, 'Luther posts his 95 Theses'], [1522, 'Magellan\'s expedition completes the first voyage around the world'],
  [1588, 'The Spanish Armada is defeated'], [1620, 'The Mayflower lands in New England'], [1648, 'The Peace of Westphalia ends the Thirty Years\' War'],
  [1688, 'England\'s Glorious Revolution'], [1789, 'The storming of the Bastille'], [1815, 'Napoleon is defeated at Waterloo'],
  [1861, 'The Kingdom of Italy is proclaimed'], [1868, 'Japan\'s Meiji Restoration'], [1871, 'Germany is unified as an empire'],
  [1914, 'The First World War begins'], [1929, 'The Wall Street Crash'], [1945, 'The United Nations is founded'],
  [1949, 'The People\'s Republic of China is proclaimed'], [1969, 'Apollo 11 lands on the Moon'], [1994, 'South Africa\'s first free election ends apartheid'],
];

const INVENTIONS = [
  ['Johannes Gutenberg', 'Movable-type printing press'], ['Galileo Galilei', 'Telescope turned on Jupiter\'s moons'], ['James Watt', 'Steam engine with a separate condenser'],
  ['Samuel Morse', 'Dot-and-dash telegraph code'], ['Alessandro Volta', 'The first electric battery'], ['Michael Faraday', 'Electromagnetic induction'],
  ['Thomas Edison', 'The phonograph'], ['Alexander Graham Bell', 'The first telephone patent'], ['Guglielmo Marconi', 'Radio messages across the Atlantic'],
  ['Karl Benz', 'The first practical petrol motorcar'], ['The Wright brothers', 'The first powered aeroplane flight'], ['Nikola Tesla', 'The AC induction motor'],
];

const ARTWORKS = [
  ['Sandro Botticelli', 'The Birth of Venus'], ['Leonardo da Vinci', 'The Last Supper'], ['Michelangelo', 'The marble David'],
  ['Raphael', 'The School of Athens'], ['Filippo Brunelleschi', 'The dome of Florence Cathedral'], ['Lorenzo Ghiberti', 'The Baptistery\'s Gates of Paradise'],
  ['Donatello', 'The bronze David'], ['Giotto', 'The Scrovegni Chapel frescoes'], ['Masaccio', 'The Holy Trinity fresco'],
  ['Titian', 'Venus of Urbino'], ['Caravaggio', 'The Calling of Saint Matthew'], ['Gian Lorenzo Bernini', 'The Ecstasy of Saint Teresa'],
];

const WAR_WORDS = ['LEGION', 'CANNAE', 'CAVALRY', 'FLANK', 'SIEGE', 'GARRISON', 'ARMOUR', 'BASTION', 'CITADEL', 'RAMPART', 'TRENCH', 'SENTRY',
  'CANNON', 'MUSKET', 'LANCER', 'FORTRESS', 'VANGUARD', 'PHALANX', 'TRIREME', 'CATAPULT', 'PIKEMEN', 'ARCHERS', 'BANNER', 'CONVOY', 'ESCORT',
  'AMBUSH', 'CAMPAIGN', 'MERCENARY', 'GALLEY', 'RETREAT'];

export default {
  id: 'compass',
  kind: 'seals',
  number: '02',
  title: 'The Compass Ledger',
  time: '09:10',
  briefing: [
    'Last night a restorer cleaning an old altarpiece found a compass and set-square scratched under the varnish, beside six tiny seals.',
    'They are the mark of the <b>Compagnia del Compasso</b>, a secret guild of Renaissance engineers. Its lost ledger of inventions is hidden somewhere in the city, and a rival collector\'s people are already hunting it.',
    '<b>Your job:</b> break the six seals before they do.',
  ],
  tasks: ['Six seals wait at landmarks: open them in any order', 'Each seal gives one letter of a hidden word', 'Wrong answers raise Heat: the rivals close in', 'Questions and places change every play'],
  handler: [
    'The guild\'s seals are cut into stone around the centre. The gold arrows point to every one you haven\'t broken.',
    'Your Notebook keeps the seal board. Break four and you may guess the hidden word.',
  ],
  maxHeat: 3,
  guessAt: 4, // seals broken before the word may be guessed (Hitoshi's choice)
  subjects: [
    { id: 'world', name: 'World history', makers: [ordering(EVENTS), ordering(EVENTS), choice(FACTS.world)] },
    { id: 'art', name: 'Art history', makers: [choice(FACTS.art), choice(FACTS.art), matching(ARTWORKS, 'The lost labels', 'Four works in the guild\'s ledger have lost their labels. Join each artist to the work.')] },
    { id: 'military', name: 'Military history', makers: [cipher(WAR_WORDS), choice(FACTS.military)] },
    { id: 'tech', name: 'History of technology', makers: [choice(FACTS.tech), matching(INVENTIONS, 'The guild\'s heroes', 'Four statues in the guild\'s ledger have lost their plaques. Join each maker to what they are remembered for.')] },
    { id: 'mech', name: 'Mechanical engineering', makers: [gearWheel, gearSpeed, lever, pulley] },
    { id: 'elec', name: 'Electrical engineering', makers: [logic, logic, seriesResistor, power, parallel] },
  ],
  // Where seals can be cut (six are used each play), in metres on the city plan.
  sites: [
    { id: 'baptistery', name: 'Baptistery doors', at: [-140, 6] },
    { id: 'north', name: 'Duomo north door', at: [-60, -52] },
    { id: 'campanile', name: 'Campanile', at: [-110, 62] },
    { id: 'apse', name: 'Duomo east end', at: [66, 0] },
    { id: 'tower', name: 'Palazzo Vecchio tower', at: [-48, 450] },
    { id: 'neptune', name: 'Neptune fountain', at: [-68, 478] },
    { id: 'loggia', name: 'Loggia dei Lanzi', at: [-62, 514] },
    { id: 'ponte', name: 'Ponte Vecchio', at: [-140, 668] },
    { id: 'pitti', name: 'Piazza de\' Pitti', at: [-130, 850] },
  ],
  // The hidden word, one per play, and the place it sends you for the ledger.
  words: [
    { word: 'CUPOLA', place: 'the Duomo\'s dome', at: [66, 4] },
    { word: 'LOGGIA', place: 'the Loggia dei Lanzi', at: [-56, 516] },
    { word: 'BRIDGE', place: 'Ponte Vecchio', at: [-140, 660] },
    { word: 'BELFRY', place: 'the Campanile', at: [-104, 60] },
    { word: 'CLOCKS', place: 'the Palazzo Vecchio tower', at: [-46, 444] },
    { word: 'GARDEN', place: 'the garden gate at the Pitti', at: [-124, 856] },
  ],
};
