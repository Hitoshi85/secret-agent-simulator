// Case 02, The Compass Ledger: a fictional guild of engineers hid its ledger behind six seals, one per
// subject. Rules in src/case/seals.js, questions in src/case/quiz.js; here: story, places, words, banks.
import { MAKERS } from '../case/quiz.js';
import { FACTS } from './compass-facts.js';

const { gearWheel, gearSpeed, lever, pulley, seriesResistor, power, parallel, logic, cipher, ordering, matching, choice } = MAKERS;

// [year, event]; BC years are negative. Any five at least 8 years apart make an ordering question.
const EVENTS = [
  [-776, 'The first recorded Olympic Games'], [-509, 'Rome becomes a republic'], [-490, 'The Battle of Marathon'],
  [-323, 'Alexander the Great dies in Babylon'], [-221, 'Qin Shi Huang unifies China'], [-44, 'Julius Caesar is assassinated'],
  [-27, 'Augustus becomes the first Roman emperor'], [79, 'Vesuvius buries Pompeii'], [313, 'The Edict of Milan tolerates Christianity'],
  [476, 'The last Western Roman emperor is deposed'], [622, 'Muhammad\'s journey to Medina, the Hijra'], [800, 'Charlemagne is crowned emperor in Rome'],
  [1066, 'The Norman conquest of England'], [1096, 'The First Crusade sets out'], [1206, 'Genghis Khan is proclaimed ruler of the Mongols'],
  [1215, 'Magna Carta is sealed in England'], [1271, 'Marco Polo sets out for China'], [1337, 'The Hundred Years\' War begins'],
  [1348, 'The Black Death reaches Florence'], [1381, 'The Peasants\' Revolt in England'], [1397, 'The Medici Bank is founded in Florence'],
  [1415, 'The Battle of Agincourt'], [1453, 'Constantinople falls to the Ottomans'], [1492, 'Columbus reaches the Caribbean'],
  [1498, 'Vasco da Gama reaches India by sea'], [1504, 'Michelangelo\'s David is unveiled in Florence'], [1517, 'Luther posts his 95 Theses'],
  [1519, 'Cortés lands in Mexico'], [1522, 'Magellan\'s expedition completes the first voyage around the world'],
  [1543, 'Copernicus publishes his Sun-centred universe'], [1588, 'The Spanish Armada is defeated'], [1603, 'The Tokugawa shogunate begins in Japan'],
  [1620, 'The Mayflower lands in New England'], [1633, 'Galileo is tried by the Inquisition'], [1648, 'The Peace of Westphalia ends the Thirty Years\' War'],
  [1687, 'Newton publishes the Principia'], [1688, 'England\'s Glorious Revolution'], [1776, 'The US Declaration of Independence'],
  [1789, 'The storming of the Bastille'], [1804, 'Napoleon crowns himself emperor'], [1815, 'Napoleon is defeated at Waterloo'],
  [1848, 'Revolutions sweep across Europe'], [1861, 'The Kingdom of Italy is proclaimed'], [1865, 'The American Civil War ends'],
  [1868, 'Japan\'s Meiji Restoration'], [1869, 'The Suez Canal opens'], [1871, 'Germany is unified as an empire'],
  [1903, 'The Wright brothers\' first powered flight'], [1914, 'The First World War begins'], [1917, 'The Russian Revolution'],
  [1929, 'The Wall Street Crash'], [1939, 'The Second World War begins'], [1945, 'The United Nations is founded'],
  [1947, 'India and Pakistan become independent'], [1949, 'The People\'s Republic of China is proclaimed'], [1957, 'Sputnik 1 is launched'],
  [1969, 'Apollo 11 lands on the Moon'], [1989, 'The Berlin Wall falls'], [1994, 'South Africa\'s first free election ends apartheid'],
  [-753, 'Rome\'s legendary founding'], [-432, 'The Parthenon is completed in Athens'], [-399, 'Socrates is put to death in Athens'],
  [-264, 'The First Punic War begins'], [-218, 'Hannibal crosses the Alps'], [-146, 'Rome destroys Carthage'],
  [-31, 'The Battle of Actium'], [64, 'The Great Fire of Rome'], [117, 'The Roman Empire reaches its greatest size under Trajan'],
  [330, 'Constantinople becomes the capital of the Roman Empire'], [410, 'The Visigoths sack Rome'], [537, 'Hagia Sophia is completed in Constantinople'],
  [732, 'The Battle of Tours'], [793, 'Vikings raid the monastery at Lindisfarne'], [1054, 'The Great Schism splits the Eastern and Western Churches'],
  [1088, 'The University of Bologna is founded'], [1187, 'Saladin takes Jerusalem'], [1252, 'Florence strikes its first gold florin'],
  [1265, 'Dante is born in Florence'], [1296, 'Work begins on Florence Cathedral'], [1299, 'Building of Palazzo Vecchio begins'],
  [1309, 'The papacy moves to Avignon'], [1378, 'The Ciompi wool workers revolt in Florence'], [1405, 'Zheng He\'s treasure fleet first sails'],
  [1434, 'Cosimo de\' Medici returns to rule Florence'], [1436, 'Florence Cathedral is consecrated under its new dome'], [1478, 'The Pazzi conspiracy attacks the Medici'],
  [1494, 'The Medici are expelled from Florence'], [1512, 'The Medici return to power in Florence'], [1527, 'Imperial troops sack Rome'],
  [1534, 'Henry VIII breaks with the Pope'], [1545, 'The Council of Trent opens'], [1569, 'Cosimo I becomes Grand Duke of Tuscany'],
  [1571, 'The Battle of Lepanto'], [1600, 'The English East India Company is founded'], [1607, 'Jamestown is founded in Virginia'],
  [1618, 'The Thirty Years\' War begins'], [1666, 'The Great Fire of London'], [1683, 'The Ottoman siege of Vienna is broken'],
  [1707, 'England and Scotland unite as Great Britain'], [1737, 'The last Medici grand duke dies'], [1755, 'An earthquake destroys Lisbon'],
  [1756, 'The Seven Years\' War begins'], [1783, 'Britain recognises American independence'], [1799, 'Napoleon seizes power in France'],
  [1807, 'Britain abolishes the slave trade'], [1821, 'Greece begins its war of independence'], [1825, 'The Stockton and Darlington Railway opens'],
  [1833, 'Britain abolishes slavery in most of its empire'], [1839, 'The First Opium War begins'], [1853, 'Commodore Perry\'s ships arrive in Japan'],
  [1859, 'Darwin publishes On the Origin of Species'], [1863, 'Lincoln\'s Emancipation Proclamation'], [1876, 'Bell patents the telephone'],
  [1896, 'The first modern Olympic Games in Athens'], [1912, 'The Titanic sinks'], [1920, 'The League of Nations first meets'],
  [1922, 'Mussolini\'s March on Rome'], [1933, 'Hitler becomes chancellor of Germany'], [1946, 'Italy votes to become a republic'],
  [1948, 'The state of Israel is founded'], [1950, 'The Korean War begins'], [1962, 'The Cuban Missile Crisis'],
  [1963, 'President Kennedy is assassinated'], [1966, 'The Arno floods Florence'], [1975, 'The Vietnam War ends'],
  [1979, 'The Iranian Revolution'], [1986, 'The Chernobyl disaster'], [1991, 'The Soviet Union dissolves'],
  [1993, 'The European Union is formed'], [2001, 'The September 11 attacks in the United States'], [2002, 'Euro notes and coins come into use'],
];

const INVENTIONS = [
  ['Johannes Gutenberg', 'Movable-type printing press'], ['Galileo Galilei', 'Telescope turned on Jupiter\'s moons'],
  ['James Watt', 'Steam engine with a separate condenser'], ['Samuel Morse', 'Dot-and-dash telegraph code'],
  ['Alessandro Volta', 'The first electric battery'], ['Michael Faraday', 'Electromagnetic induction'],
  ['Thomas Edison', 'The phonograph'], ['Alexander Graham Bell', 'The first telephone patent'],
  ['Guglielmo Marconi', 'Radio messages across the Atlantic'], ['Karl Benz', 'The first practical petrol motorcar'],
  ['The Wright brothers', 'The first powered aeroplane flight'], ['Nikola Tesla', 'The AC induction motor'],
  ['Charles Babbage', 'The Analytical Engine design'], ['Ada Lovelace', 'The first published computer program'],
  ['Tim Berners-Lee', 'The World Wide Web'], ['George Stephenson', 'The Rocket locomotive'],
  ['Richard Arkwright', 'The water frame spinning machine'], ['Christiaan Huygens', 'The pendulum clock'],
  ['John Harrison', 'A sea clock for finding longitude'], ['Louis Daguerre', 'An early practical photograph process'],
  ['Rudolf Diesel', 'The compression-ignition engine'], ['Enrico Fermi', 'The first nuclear reactor'],
  ['Robert Goddard', 'The first liquid-fuelled rocket'], ['Eli Whitney', 'The cotton gin'],
];

const ARTWORKS = [
  ['Sandro Botticelli', 'The Birth of Venus'], ['Leonardo da Vinci', 'The Last Supper'], ['Michelangelo', 'The marble David'],
  ['Raphael', 'The School of Athens'], ['Filippo Brunelleschi', 'The dome of Florence Cathedral'], ['Lorenzo Ghiberti', 'The Baptistery\'s Gates of Paradise'],
  ['Donatello', 'The bronze David'], ['Giotto', 'The Scrovegni Chapel frescoes'], ['Masaccio', 'The Holy Trinity fresco'],
  ['Titian', 'Venus of Urbino'], ['Caravaggio', 'The Calling of Saint Matthew'], ['Gian Lorenzo Bernini', 'The Ecstasy of Saint Teresa'],
  ['Rembrandt', 'The Night Watch'], ['Johannes Vermeer', 'Girl with a Pearl Earring'], ['Diego Velázquez', 'Las Meninas'],
  ['Jan van Eyck', 'The Arnolfini Portrait'], ['Hieronymus Bosch', 'The Garden of Earthly Delights'], ['Katsushika Hokusai', 'The Great Wave off Kanagawa'],
  ['Claude Monet', 'Impression, Sunrise'], ['Vincent van Gogh', 'The Starry Night'], ['Pablo Picasso', 'Guernica'],
  ['Edvard Munch', 'The Scream'], ['Benvenuto Cellini', 'Perseus with the head of Medusa'], ['Bartolomeo Ammannati', 'The Neptune fountain in the Signoria'],
];

const WAR_WORDS = ['LEGION', 'CANNAE', 'CAVALRY', 'FLANK', 'SIEGE', 'GARRISON', 'ARMOUR', 'BASTION', 'CITADEL', 'RAMPART', 'TRENCH', 'SENTRY',
  'CANNON', 'MUSKET', 'LANCER', 'FORTRESS', 'VANGUARD', 'PHALANX', 'TRIREME', 'CATAPULT', 'PIKEMEN', 'ARCHERS', 'BANNER', 'CONVOY', 'ESCORT',
  'AMBUSH', 'CAMPAIGN', 'MERCENARY', 'GALLEY', 'RETREAT'];

export const BANKS = { EVENTS, INVENTIONS, ARTWORKS, WAR_WORDS }; // for the tests

export default {
  id: 'compass',
  kind: 'seals',
  number: '02',
  title: 'The Compass Ledger',
  time: '09:10',
  briefing: [
    'Last night a restorer cleaning an old altarpiece found a compass and set-square scratched under the varnish, beside six tiny seals.',
    'They are the mark of the <b>Compagnia del Compasso</b>, a secret guild of Renaissance engineers. Its lost ledger of inventions is hidden somewhere in the city, and a dealer\'s people are already hunting it. Someone is paying them very well.',
    '<b>Your job:</b> break the six seals before they do.',
  ],
  tasks: ['Six seals wait at landmarks: open them in any order', 'Each seal gives one letter of a hidden word', 'Wrong answers raise Heat: the rivals close in', 'Questions and places change every play'],
  handler: [
    'The guild\'s seals are cut into stone around the centre. The gold arrows point to every one you haven\'t broken.',
    'Your Notebook keeps the seal board. Break four and you may guess the hidden word.',
    'The dealer\'s people are in the piazzas. They talk like buyers, but buyers don\'t carry lighter fluid.',
  ],
  // Phase one's thread (Hitoshi, 2026-11-21): the dealer was never the buyer. Shown on the win card.
  epilogue: [
    'In the ledger\'s cover, a note in the dealer\'s hand: “Not for sale. Someone else wanted it gone.” The dealer was never the buyer.',
  ],
  // The handler's sign-off on the win and loss cards (Hitoshi, 2026-11-21): the same line in every case.
  signoff: 'Pienza, and now this. Someone is behind all of it.',
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
