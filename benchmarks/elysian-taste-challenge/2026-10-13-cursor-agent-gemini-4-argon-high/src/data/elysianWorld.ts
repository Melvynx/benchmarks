export const ELYSIAN_IMAGES = {
  stillLife: {
    url: 'https://code.melvynx.dev/elysian-classical-surreal-still-life.png',
    fallback: '/archive/1-still-life.png',
    title: 'Le Cabinet du Paradoxe',
    subtitle: 'Classical Surreal Still Life',
    catalogId: 'ARCH-I · 2944×1648',
    coordinates: '37°58′17″N · 23°43′32″E',
  },
  scholarlyLandscape: {
    url: 'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-greco-roman-scholarly-landscape.png',
    fallback: '/archive/2-scholarly-landscape.png',
    title: 'Le Traité Vésuvien',
    subtitle: 'Greco-Roman Scholarly Landscape',
    catalogId: 'ARCH-II · 1456×816',
    coordinates: '40°49′17″N · 14°25′33″E',
  },
  mountainValley: {
    url: 'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-vibrant-mountain-river-valley.png',
    fallback: '/archive/3-mountain-valley.png',
    title: 'L’Arcadie de Safran',
    subtitle: 'Vibrant Mountain River Valley',
    catalogId: 'ARCH-III · 1456×816',
    coordinates: '46°10′04″N · 08°46′19″E',
  },
  goldenTemple: {
    url: 'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-golden-temple-starry-night.png',
    fallback: '/archive/4-golden-temple.png',
    title: 'Le Naos des Étoiles',
    subtitle: 'Golden Temple Starry Night',
    catalogId: 'ARCH-IV · 1456×816',
    coordinates: '38°28′56″N · 22°30′04″E',
  },
} as const;

export type AtmosphereId = 'pelagic' | 'vesuvian' | 'arcadian' | 'astral';

export interface AtmosphereTheme {
  id: AtmosphereId;
  roman: string;
  name: string;
  latin: string;
  bgPrimary: string;
  bgElevated: string;
  accentGold: string;
  accentCoral: string;
  textPrimary: string;
  textMuted: string;
  glowColor: string;
  description: string;
}

export const ATMOSPHERES: AtmosphereTheme[] = [
  {
    id: 'pelagic',
    roman: 'I',
    name: 'Nocturne Pélagique',
    latin: 'Abyssus & Marmor',
    bgPrimary: '#061519',
    bgElevated: '#0C242B',
    accentGold: '#F4A900',
    accentCoral: '#FF6E7A',
    textPrimary: '#F6F2E9',
    textMuted: '#99B3B9',
    glowColor: 'rgba(244, 169, 0, 0.24)',
    description: 'Deep Aegean storm-teal with Parian marble highlights and burnished saffron vessels.',
  },
  {
    id: 'vesuvian',
    roman: 'II',
    name: 'Cendre de Vésuve',
    latin: 'Ignis & Codex',
    bgPrimary: '#13161D',
    bgElevated: '#1E222D',
    accentGold: '#FFAE19',
    accentCoral: '#FF646B',
    textPrimary: '#FAF3EE',
    textMuted: '#C2A8AA',
    glowColor: 'rgba(255, 100, 107, 0.28)',
    description: 'Coral volcanic plumes suspended over gilded treatises and stoic marble busts.',
  },
  {
    id: 'arcadian',
    roman: 'III',
    name: 'Méridien de Safran',
    latin: 'Vallis Aurea',
    bgPrimary: '#081C24',
    bgElevated: '#102D38',
    accentGold: '#FFD026',
    accentCoral: '#FF8A75',
    textPrimary: '#F9F7F0',
    textMuted: '#A7C4CE',
    glowColor: 'rgba(255, 208, 38, 0.26)',
    description: 'Hyper-saturated saffron moss valleys beneath cerulean skies and glacial rapids.',
  },
  {
    id: 'astral',
    roman: 'IV',
    name: 'Obsidienne Astrale',
    latin: 'Naos Sidereus',
    bgPrimary: '#040D12',
    bgElevated: '#091B23',
    accentGold: '#FFB800',
    accentCoral: '#FF5C77',
    textPrimary: '#F5F5F7',
    textMuted: '#8DA6B2',
    glowColor: 'rgba(255, 184, 0, 0.30)',
    description: 'Star-speckled sanctuary portals framed by six Corinthian columns of living gold.',
  },
];

export interface SpecimenRelic {
  id: string;
  number: string;
  title: string;
  latinName: string;
  xPercent: number; // Position on Still Life image (0-100)
  yPercent: number;
  cropX: number; // Background position X% for magnified crop
  cropY: number; // Background position Y% for magnified crop
  cropScale: number; // Scale factor
  maskShape: 'arch' | 'medallion' | 'octagram' | 'vesica' | 'pediment' | 'chalice';
  category: string;
  olfactoryNotes: string[];
  pigments: { name: string; hex: string }[];
  epigraph: string;
  curatorNote: string;
}

export const STILL_LIFE_SPECIMENS: SpecimenRelic[] = [
  {
    id: 'alpine-frame',
    number: '01',
    title: 'L’Enclos Alpin',
    latinName: 'Speculum Montis Nivei',
    xPercent: 19,
    yPercent: 48,
    cropX: 16,
    cropY: 46,
    cropScale: 340,
    maskShape: 'arch',
    category: 'Optical Relic · Paradox Frame',
    olfactoryNotes: ['Glacial Ozone', 'Gilded Pine Resin', 'Cold Silver Leaf'],
    pigments: [
      { name: 'Baroque Gold', hex: '#E59B14' },
      { name: 'Alpine Slate', hex: '#2B3A42' },
      { name: 'Carnation Rose', hex: '#F37986' },
    ],
    epigraph: '“A mountain captured in gold weighs less than the cloud that crowns it.”',
    curatorNote:
      'An ornate gilded frame resting on scholarly folios holds not a portrait, but a monochrome summit of eternal winter—flanked by blooming pink carnations that defy the frost within the glass.',
  },
  {
    id: 'meander-vessels',
    number: '02',
    title: 'L’Urne au Méandre & Amphore',
    latinName: 'Vas Aureum Labyrinthi',
    xPercent: 41,
    yPercent: 64,
    cropX: 40,
    cropY: 65,
    cropScale: 360,
    maskShape: 'chalice',
    category: 'Alchemical Vessel · Gold & Cobalt',
    olfactoryNotes: ['Smoked Labdanum', 'Crushed Coriander', 'Honeyed Myrrh'],
    pigments: [
      { name: 'Meander Gold', hex: '#F4A900' },
      { name: 'Delft Cobalt', hex: '#18364A' },
      { name: 'Saffron Silk', hex: '#E87A1E' },
    ],
    epigraph: '“What is sealed in the labyrinthine urn remembers the banquet of the gods.”',
    curatorNote:
      'Engraved with an unbroken Greek key, the lidded golden vessel guards volatile botanical macerations beside a midnight-blue porcelain amphora painted with ghost-white flora.',
  },
  {
    id: 'acropolis-crag',
    number: '03',
    title: 'Le Parthénon des Brumes',
    latinName: 'Arx Supra Nubes',
    xPercent: 54,
    yPercent: 23,
    cropX: 54,
    cropY: 19,
    cropScale: 350,
    maskShape: 'pediment',
    category: 'Architectural Horizon · High Crag',
    olfactoryNotes: ['Wet Basalt', 'Cypress Needle', 'Rosewater Vapor'],
    pigments: [
      { name: 'Pelagic Sky', hex: '#0D2F38' },
      { name: 'Cloud Rose', hex: '#F3A7B0' },
      { name: 'Doric Ash', hex: '#7C868B' },
    ],
    epigraph: '“Above the scholars’ table, the temple floats on teeth of black stone.”',
    curatorNote:
      'Perched atop jagged obsidian crags and framed by rose-tinted storm cumulus, the grey Doric sanctuary anchors the surreal still life in ancient Mediterranean myth.',
  },
  {
    id: 'twin-marbles',
    number: '04',
    title: 'L’Oracle Couché & Le Buste',
    latinName: 'Caput Marmoreum Somni',
    xPercent: 61,
    yPercent: 68,
    cropX: 62,
    cropY: 69,
    cropScale: 340,
    maskShape: 'medallion',
    category: 'Parian Sculpture · Dual State',
    olfactoryNotes: ['Warm White Amber', 'Orris Butter', 'Chalk & Fig Milk'],
    pigments: [
      { name: 'Parian White', hex: '#F4F1EA' },
      { name: 'Pedestal Rose', hex: '#FF7082' },
      { name: 'Burnt Ochre', hex: '#DF6D14' },
    ],
    epigraph: '“One marble gazes toward eternity; the other sleeps upon the saffron cloth.”',
    curatorNote:
      'A dialogue in carved stone: an upright patrician bust elevated on a bubblegum-pink plinth looks past a disembodied classical head resting sideways in lucid slumber.',
  },
  {
    id: 'rose-column',
    number: '05',
    title: 'La Colonne Cannelée Rose',
    latinName: 'Columna Corallina',
    xPercent: 77,
    yPercent: 35,
    cropX: 79,
    cropY: 32,
    cropScale: 350,
    maskShape: 'vesica',
    category: 'Monolith · Chromatic Anomaly',
    olfactoryNotes: ['Damask Rose Otto', 'Pink Peppercorn', 'Mineral Salt'],
    pigments: [
      { name: 'Fluted Coral', hex: '#FF6B7B' },
      { name: 'Abyssal Pine', hex: '#091F24' },
      { name: 'Storm Alabaster', hex: '#E8E3DC' },
    ],
    epigraph: '“Carved not from quarry stone, but from petrified twilight.”',
    curatorNote:
      'A monumental fluted shaft dyed the color of volcanic coral pierces the teal firmament, bridging the miniature table of curiosities with the colossal alpine horizon.',
  },
  {
    id: 'mortar-codices',
    number: '06',
    title: 'Le Mortier de Poudre & Codices',
    latinName: 'Pulvis Alba & Folia',
    xPercent: 49,
    yPercent: 86,
    cropX: 49,
    cropY: 88,
    cropScale: 370,
    maskShape: 'octagram',
    category: 'Materia Prima · Alchemical Table',
    olfactoryNotes: ['Pulverized Nacre', 'Old Vellum Ink', 'Bitter Almond'],
    pigments: [
      { name: 'Calcite Dust', hex: '#FFFFFF' },
      { name: 'Vellum Cream', hex: '#E6DEC8' },
      { name: 'Obsidian Mortar', hex: '#142329' },
    ],
    epigraph: '“Grind the marble until it speaks; open the book until the wind turns its leaves.”',
    curatorNote:
      'At the very threshold of the canvas, a dark stone mortar holds luminous white powder beside a spiral sea-shell and densely typeset Renaissance treatises.',
  },
];

export interface MaisonEdition {
  id: string;
  roman: string;
  title: string;
  subtitle: string;
  designation: string;
  volume: string;
  rarity: string;
  sourceImage: string;
  secondaryImage: string;
  primaryCrop: { x: number; y: number; scale: number };
  secondaryCrop: { x: number; y: number; scale: number };
  silhouette: 'amphora' | 'codex' | 'chalice' | 'portal';
  accords: string[];
  story: string;
  accentHex: string;
}

export const MAISON_EDITIONS: MaisonEdition[] = [
  {
    id: 'paradoxe-de-paros',
    roman: 'N° I',
    title: 'Paradoxe de Paros',
    subtitle: 'Extrait de Marbre, Œillet & Or Grec',
    designation: 'Flacon Sculpté · Édition de Trente',
    volume: '50 ML · EXTRAIT PUR',
    rarity: '30 Numbered Flacons',
    sourceImage: ELYSIAN_IMAGES.stillLife.url,
    secondaryImage: ELYSIAN_IMAGES.goldenTemple.url,
    primaryCrop: { x: 62, y: 62, scale: 240 },
    secondaryCrop: { x: 18, y: 50, scale: 260 },
    silhouette: 'amphora',
    accords: ['Cold Parian Marble', 'Spiced Carnation', 'Gilded Labdanum', 'Crushed Sea Shell'],
    story:
      'Macerated in dark porcelain and decanted beside fluted coral stone. Opens with the mineral chill of chiselled statuary before surrendering to warm saffron drapery.',
    accentHex: '#FF6E7A',
  },
  {
    id: 'cendre-de-vesuve',
    roman: 'N° II',
    title: 'Cendre de Vésuve',
    subtitle: 'Fumée Corail, Rose Ancienne & Vélin',
    designation: 'Reliquaire & Folio · Édition de Vingt',
    volume: '75 ML + CODEX RELIÉ',
    rarity: '20 Archival Sets',
    sourceImage: ELYSIAN_IMAGES.scholarlyLandscape.url,
    secondaryImage: ELYSIAN_IMAGES.stillLife.url,
    primaryCrop: { x: 74, y: 38, scale: 230 },
    secondaryCrop: { x: 46, y: 68, scale: 250 },
    silhouette: 'codex',
    accords: ['Volcanic Pink Ash', 'Centifolia Rose Bouquet', 'Gilded Parchment', 'Smoked Cypress'],
    story:
      'Born at the exact second a scholar’s library meets the trembling mountain. Tart coral smoke coils around golden-bound tomes and overflowing brass urns.',
    accentHex: '#F4A900',
  },
  {
    id: 'vallee-de-safran',
    roman: 'N° III',
    title: 'Vallée de Safran',
    subtitle: 'Mousse Dorée, Névé & Eau de Roche',
    designation: 'Élixir Botanique · Récolte d’Altitude',
    volume: '100 ML · EAU D’ARCADIE',
    rarity: '45 Numbered Carafes',
    sourceImage: ELYSIAN_IMAGES.mountainValley.url,
    secondaryImage: ELYSIAN_IMAGES.scholarlyLandscape.url,
    primaryCrop: { x: 52, y: 58, scale: 210 },
    secondaryCrop: { x: 25, y: 78, scale: 260 },
    silhouette: 'chalice',
    accords: ['Wild Saffron Moss', 'Glacial Meltwater', 'Peach-Blossom Shrub', 'Blue River Boulder'],
    story:
      'Distilled from an impossible alpine valley where the meadows burn golden-yellow beneath whipped alabaster clouds and ice-blue rapids.',
    accentHex: '#FFD026',
  },
  {
    id: 'naos-des-etoiles',
    roman: 'N° IV',
    title: 'Naos des Étoiles',
    subtitle: 'Ambre Sidéral, Résine d’Or & Nuit Égéenne',
    designation: 'Talisman Nocturne · Sanctuaire Fermé',
    volume: '30 ML · ABSOLUE CÉLESTE',
    rarity: '12 Sanctuary Keys',
    sourceImage: ELYSIAN_IMAGES.goldenTemple.url,
    secondaryImage: ELYSIAN_IMAGES.mountainValley.url,
    primaryCrop: { x: 50, y: 52, scale: 200 },
    secondaryCrop: { x: 82, y: 70, scale: 280 },
    silhouette: 'portal',
    accords: ['Corinthian Gold Resin', 'Nocturnal Coral Flora', 'Starlit Ozone', 'Black Frankincense'],
    story:
      'Bottled at midnight on the steps of a six-columned golden temple whose central portal opens not into a cella of stone, but directly into the deep-teal cosmos.',
    accentHex: '#FFB800',
  },
];
