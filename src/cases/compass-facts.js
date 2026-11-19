// Fact questions for Case 02, by subject. Each is { id, q, a, wrong, why }: the game shows the right
// answer and three of the wrong ones at random, so a fact that comes back looks different. Keep at
// least four wrong answers, every one clearly wrong, and the `why` short. Ids never change once used
// (the game remembers seen ids on the phone).
export const FACTS = {
  world: [
    { id: 'w-florin', q: 'Florence\'s gold coin, first struck in 1252 and trusted across Europe, was the…', a: 'Florin', wrong: ['Ducat', 'Thaler', 'Doubloon', 'Écu'], why: 'The gold florin carried Florence\'s lily; Venice copied it with the ducat in 1284.' },
    { id: 'w-inca', q: 'Which people built Machu Picchu in the Andes?', a: 'The Inca', wrong: ['The Aztecs', 'The Maya', 'The Olmecs', 'The Toltecs'], why: 'Machu Picchu was built for the Inca emperor Pachacuti in the 1400s.' },
    { id: 'w-1789', q: 'In which year did the French Revolution begin?', a: '1789', wrong: ['1776', '1799', '1815', '1830'], why: 'The Bastille fell on 14 July 1789.' },
  ],
  art: [
    { id: 'a-dome', title: 'The dome without a frame', q: 'Florence\'s cathedral dome (1420–1436) was raised without a full wooden frame underneath. Which trick kept the bricks from sliding in while the mortar set?', a: 'Bricks laid in a herringbone pattern', wrong: ['Flying buttresses around the drum', 'Poured Roman concrete, like the Pantheon', 'Steel ring beams hidden in the walls', 'A cable net hung from the lantern'], why: 'Upright bricks every few courses locked each ring in place: Brunelleschi\'s herringbone.' },
    { id: 'a-medici', q: 'Which Florentine banking family were great patrons of Botticelli and the young Michelangelo?', a: 'The Medici', wrong: ['The Borgia', 'The Sforza', 'The Este', 'The Visconti'], why: 'Lorenzo de\' Medici took the teenage Michelangelo into his household.' },
    { id: 'a-fresco', q: 'What is fresco painting?', a: 'Painting into wet lime plaster', wrong: ['Painting with egg yolk on wooden panels', 'Oil paint on stretched canvas', 'Ink on silk scrolls', 'Coloured glass set in lead'], why: 'The colour binds as the plaster dries, so it lasts as long as the wall.' },
  ],
  military: [
    { id: 'm-cannae', title: 'The pincer', q: 'In 216 BC Hannibal destroyed a much larger Roman army at Cannae. How?', a: 'His centre bent back, then both wings closed around them', wrong: ['Siege towers pushed against the Roman camp', 'Longbow volleys from the hills', 'Burning the Roman fleet with Greek fire', 'A night attack across a frozen river'], why: 'The double envelopment at Cannae is still studied in staff colleges.' },
    { id: 'm-lanzi', q: 'Florence\'s Loggia dei Lanzi is named after which soldiers, once posted there?', a: 'German Landsknecht pikemen of Cosimo I', wrong: ['The Pope\'s Swiss Guards', 'French musketeers', 'Venetian galley crews', 'English longbowmen'], why: '"Lanzi" is the Italian for Landsknechts, the duke\'s mercenary guard.' },
    { id: 'm-cannon', q: 'What made tall medieval castle walls far less safe in the 1400s?', a: 'Gunpowder cannon', wrong: ['The crossbow', 'The stirrup', 'Chain mail', 'The trebuchet'], why: 'Cannon smashed high thin walls, so engineers built low, thick, angled bastions.' },
  ],
  tech: [
    { id: 't-type', q: 'What made Gutenberg\'s press of the 1440s so much faster than copying by hand?', a: 'Reusable metal movable type', wrong: ['Steam power', 'Photographic plates', 'Typewriter keys', 'Electric motors'], why: 'Letters cast in metal could be set, printed, and set again for the next page.' },
    { id: 't-condenser', q: 'How did James Watt\'s separate condenser improve the steam engine?', a: 'The cylinder no longer had to be cooled every stroke', wrong: ['It burned oil instead of coal', 'It boiled water with electricity', 'It turned the piston into a turbine', 'It ran on compressed air'], why: 'Condensing steam in a separate chamber kept the cylinder hot and saved most of the fuel.' },
    { id: 't-pendulum', q: 'Who noticed that a pendulum takes the same time to swing however wide the swing is (for small swings)?', a: 'Galileo Galilei', wrong: ['Leonardo da Vinci', 'Isaac Newton', 'Evangelista Torricelli', 'Johannes Kepler'], why: 'Galileo\'s observation later let Huygens build the first accurate pendulum clock.' },
  ],
};
