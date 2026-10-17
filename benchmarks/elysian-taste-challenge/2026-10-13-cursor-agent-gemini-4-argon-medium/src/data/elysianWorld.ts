export const ELYSIAN_IMAGES = {
  stillLife: 'https://code.melvynx.dev/elysian-classical-surreal-still-life.png',
  scholarly:
    'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-greco-roman-scholarly-landscape.png',
  valley:
    'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-vibrant-mountain-river-valley.png',
  temple:
    'https://codelynx.mlvcdn.com/uploads/2026-07-13/2026-07-13-golden-temple-starry-night.png',
} as const;

export interface MythosAct {
  id: 'still-life' | 'scholarly' | 'valley' | 'temple';
  roman: string;
  title: string;
  subtitle: string;
  latinMotto: string;
  coordinates: string;
  hourLabel: string;
  primaryImage: string;
  veilImage: string;
  accentHex: string;
  secondaryHex: string;
  poeticManifesto: string;
  curatorialNote: string;
  focalCrop: {
    leftFragmentPos: string;
    rightFragmentPos: string;
    oculusPos: string;
  };
}

export const MYTHOS_ACTS: MythosAct[] = [
  {
    id: 'still-life',
    roman: 'I',
    title: "L'Autel des Reliques Paradoxales",
    subtitle: 'Classical Surreal Still-Life · Parian Busts & Saffron Silk',
    latinMotto: 'MARMOR VIVIT IN SOMNIO RUBRO',
    coordinates: '37° 05′ N · 25° 09′ E — PAROS / ACROPOLIS',
    hourLabel: 'HORA PRIMA · CRÉPUSCULE ROSE',
    primaryImage: ELYSIAN_IMAGES.stillLife,
    veilImage: ELYSIAN_IMAGES.temple,
    accentHex: '#F26B8A',
    secondaryHex: '#FF6B35',
    poeticManifesto:
      'Where fluted bubblegum-pink columns support the weight of an impossible Acropolis, and pulverized Parian marble sleeps inside a dark stone mortar beside gilded mountain frames.',
    curatorialNote:
      'Plate I layers the tangible weight of Greco-Roman antiquity against cotton-candy cumulonimbus and vivid tangerine drapery.',
    focalCrop: {
      leftFragmentPos: '14% 48%',
      rightFragmentPos: '84% 42%',
      oculusPos: '49% 22%',
    },
  },
  {
    id: 'scholarly',
    roman: 'II',
    title: 'La Bibliothèque du Vésuve Rose',
    subtitle: 'Greco-Roman Scholarly Landscape · Erupting Coral Plume',
    latinMotto: 'CINIS DOCTUS FLORESCIT IN AETERNUM',
    coordinates: '40° 49′ N · 14° 25′ E — NEAPOLIS / PARNASSUS',
    hourLabel: 'HORA SECUNDA · ÉRUPTION DE CORAIL',
    primaryImage: ELYSIAN_IMAGES.scholarly,
    veilImage: ELYSIAN_IMAGES.stillLife,
    accentHex: '#F0A824',
    secondaryHex: '#F26B8A',
    poeticManifesto:
      'A marble ephebe rests upon mustard-gilt folios while a distant volcano exhales salmon-pink clouds across a midnight pelagic sky.',
    curatorialNote:
      'Plate II reimagines the Renaissance vanitas as a high-fashion dreamscape: open vellum manuscripts, a poised quill, and golden amphorae overflowing with roses.',
    focalCrop: {
      leftFragmentPos: '12% 55%',
      rightFragmentPos: '88% 58%',
      oculusPos: '62% 26%',
    },
  },
  {
    id: 'valley',
    roman: 'III',
    title: "La Vallée du Fleuve d'Orphée",
    subtitle: 'Vibrant Mountain River Valley · Saffron Meadows & Frozen Surf',
    latinMotto: 'FLUMEN CAERULEUM PER AUREOS CAMPOS',
    coordinates: '41° 04′ N · 23° 18′ E — HYPERBOREA / PINDUS',
    hourLabel: 'HORA TERTIA · ZÉNITH D’OR PUR',
    primaryImage: ELYSIAN_IMAGES.valley,
    veilImage: ELYSIAN_IMAGES.scholarly,
    accentHex: '#38BDF8',
    secondaryHex: '#F0A824',
    poeticManifesto:
      'Glacial azure rapids carve through meadows of molten saffron while mountain crests curl into clouds shaped like breaking ocean waves.',
    curatorialNote:
      'Plate III captures raw botanical alchemy—coral rhododendron clusters and a singular golden-leafed sentinel tree bathed in hyper-directional solar light.',
    focalCrop: {
      leftFragmentPos: '18% 76%',
      rightFragmentPos: '68% 46%',
      oculusPos: '46% 18%',
    },
  },
  {
    id: 'temple',
    roman: 'IV',
    title: 'Le Naos aux Six Colonnes Astrales',
    subtitle: 'Golden Temple Starry Night · Cosmic Threshold',
    latinMotto: 'PORTA AUREA IN SIDERA APERITUR',
    coordinates: '38° 28′ N · 22° 30′ E — DELPHI / AETHER',
    hourLabel: 'HORA QUARTA · MINUIT SIDÉRAL',
    primaryImage: ELYSIAN_IMAGES.temple,
    veilImage: ELYSIAN_IMAGES.valley,
    accentHex: '#F0A824',
    secondaryHex: '#F26B8A',
    poeticManifesto:
      'Six Corinthian columns forged from internally lit amber stand beneath a bubblegum-pink architrave ribbon; inside the cella doorway, there is no stone—only the starry abyss.',
    curatorialNote:
      'Plate IV is the nocturnal sanctum of Maison Elysian: a sacred threshold flanked by luminous coral reefs transplanted onto nocturnal rock.',
    focalCrop: {
      leftFragmentPos: '22% 68%',
      rightFragmentPos: '78% 68%',
      oculusPos: '50% 42%',
    },
  },
];

export interface AlchemicalRelic {
  id: string;
  number: string;
  name: string;
  latinTitle: string;
  sourceCanvas: 'stillLife' | 'scholarly';
  sourceUrl: string;
  /** Pin coordinates on the interactive tableau (0-100) */
  x: number;
  y: number;
  /** Crop focus for the zoomed ocular medallion */
  cropX: number;
  cropY: number;
  cropScale: number;
  category: string;
  olfactoryNote: string;
  alchemyFormula: string;
  description: string;
  shapeClass: string;
  freqHz: number;
}

export const ALCHEMICAL_RELICS: AlchemicalRelic[] = [
  {
    id: 'mountain-frame',
    number: '01',
    name: "Le Cadre d'Argent & Pic Boréal",
    latinTitle: 'SPECULUM MONTIS IN AURO',
    sourceCanvas: 'stillLife',
    sourceUrl: ELYSIAN_IMAGES.stillLife,
    x: 20,
    y: 52,
    cropX: 18,
    cropY: 50,
    cropScale: 2.6,
    category: 'PORTAIL OPTIQUE',
    olfactoryNote: 'Ozone Glaciaire, Résine de Pin Blanc, Feuille d’Or Battu',
    alchemyFormula: 'Au⁷⁹ + SiO₂ · Alt. 4,200m',
    description:
      'A baroque gilded frame resting directly on cold quarry stone, trapping a monochrome alpine summit inside a polychrome dream.',
    shapeClass: 'clip-octagon-ornate',
    freqHz: 432,
  },
  {
    id: 'mortar-carnation',
    number: '02',
    name: 'Le Mortier de Poudre Parienne',
    latinTitle: 'PULVIS MARMORIS & DIANTHUS',
    sourceCanvas: 'stillLife',
    sourceUrl: ELYSIAN_IMAGES.stillLife,
    x: 34,
    y: 78,
    cropX: 32,
    cropY: 82,
    cropScale: 2.9,
    category: 'INSTRUMENT DE TRITURATION',
    olfactoryNote: 'Poudre de Marbre Humide, Œillet Rose Épicé, Sève de Safran',
    alchemyFormula: 'CaCO₃ + Eugénol Pur · 18°C',
    description:
      'Basalt mortar and pestle brimming with freshly ground marble dust, flanked by electric pink and sulfur-yellow carnations.',
    shapeClass: 'clip-arch',
    freqHz: 528,
  },
  {
    id: 'cerulean-amphora',
    number: '03',
    name: "L'Amphore de Céruléum & Drapé Solaire",
    latinTitle: 'VAS CAERULEUM SUB VELO AURANTIO',
    sourceCanvas: 'stillLife',
    sourceUrl: ELYSIAN_IMAGES.stillLife,
    x: 56,
    y: 66,
    cropX: 56,
    cropY: 66,
    cropScale: 2.7,
    category: 'VAISSEAU DE MACÉRATION',
    olfactoryNote: 'Iris Bleu d’Attique, Écorce d’Orange Amère, Cire d’Abeille',
    alchemyFormula: 'CoAl₂O₄ + Citrus Aurantium',
    description:
      'An ancient cobalt vessel decorated with geometric meanders, bound to a slumbering marble head by a river of blazing tangerine silk.',
    shapeClass: 'clip-vesuvian-shard',
    freqHz: 594,
  },
  {
    id: 'pink-column-bust',
    number: '04',
    name: 'Le Philosophe au Socle Incarnat',
    latinTitle: 'CAPUT STOICUM IN BASI ROSEA',
    sourceCanvas: 'stillLife',
    sourceUrl: ELYSIAN_IMAGES.stillLife,
    x: 82,
    y: 44,
    cropX: 83,
    cropY: 42,
    cropScale: 2.5,
    category: 'MONOLITHE SCULPTURAL',
    olfactoryNote: 'Poivre Rose de Corinthe, Encens Blanc,Pierre Chaude',
    alchemyFormula: 'Marmor Paros · Columna Ø 64cm',
    description:
      'Curly-haired Parian bust elevated upon obsidian and neon-rose plinths beside a truncated, fluted magenta temple drum.',
    shapeClass: 'clip-arch',
    freqHz: 639,
  },
  {
    id: 'scholar-ephebe',
    number: '05',
    name: "L'Éphèbe aux Tomes d'Or & Plume",
    latinTitle: 'CODEX AUREUS ET CALAMUS',
    sourceCanvas: 'scholarly',
    sourceUrl: ELYSIAN_IMAGES.scholarly,
    x: 41,
    y: 63,
    cropX: 41,
    cropY: 64,
    cropScale: 2.5,
    category: 'ARCHIVE HERMÉTIQUE',
    olfactoryNote: 'Vélin Ancien, Encre de Sépia, Rose Jaune de Damas',
    alchemyFormula: 'Liber IV · Folium CCXIV',
    description:
      'A serene Greek youth poised atop mustard-bound treatises while an open manuscript and white quill await the dictation of the eruption.',
    shapeClass: 'clip-pediment',
    freqHz: 741,
  },
  {
    id: 'vesuvian-plume',
    number: '06',
    name: 'La Nuée Corail du Vésuve',
    latinTitle: 'IGNIS ROSEUS SUPER TEMPLUM',
    sourceCanvas: 'scholarly',
    sourceUrl: ELYSIAN_IMAGES.scholarly,
    x: 64,
    y: 28,
    cropX: 65,
    cropY: 26,
    cropScale: 2.4,
    category: 'PHÉNOMÈNE ATMOSPHÉRIQUE',
    olfactoryNote: 'Cendre Rose Volcanique, Ambre Gris, Bergamote Fumée',
    alchemyFormula: 'SO₂ + Coral Nebula · 940°K',
    description:
      'Billowing clouds of salmon-coral ash ascending behind a spectral Parthenon into a deep pelagic night.',
    shapeClass: 'clip-octagon-ornate',
    freqHz: 852,
  },
];

export interface ElysianEdition {
  id: string;
  numeral: string;
  name: string;
  subtitle: string;
  category: string;
  volume: string;
  price: number;
  priceFormatted: string;
  allocationCount: string;
  image: string;
  secondaryImage: string;
  imageCrop: string;
  secondaryCrop: string;
  accentColor: string;
  architectureStyle: 'arch-overlap' | 'vesuvian-triptych' | 'river-diptych' | 'naos-keyhole';
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  story: string;
  vesselMaterial: string;
}

export const ELYSIAN_EDITIONS: ElysianEdition[] = [
  {
    id: 'marbre-de-carnation',
    numeral: 'N° I',
    name: 'Marbre de Carnation',
    subtitle: 'Extrait de Parfum Surréaliste · Flacon Colonne Rose',
    category: 'EXTRAIT DE PARFUM CONCENTRÉ (38%)',
    volume: '50 ML · 1.7 FL. OZ.',
    price: 460,
    priceFormatted: '€460',
    allocationCount: '74 / 120 Numérotés',
    image: ELYSIAN_IMAGES.stillLife,
    secondaryImage: ELYSIAN_IMAGES.scholarly,
    imageCrop: '80% 45%',
    secondaryCrop: '25% 75%',
    accentColor: '#F26B8A',
    architectureStyle: 'arch-overlap',
    topNotes: ['Poudre de Marbre de Paros', 'Écorce d’Orange Sanguine', 'Poivre Rose'],
    heartNotes: ['Œillet Sauvage d’Attique', 'Iris Céruléen', 'Feuille de Figuier'],
    baseNotes: ['Bronze Froid', 'Oliban Sacré', 'Musc d’Albâtre'],
    story:
      'Distilled from the paradox of cold statuary and electric flora. The stopper is hand-turned from a fluted pink mineral composite modeled after the truncated column of Plate I.',
    vesselMaterial: 'Verre Cristallin Teinté Teal & Capot Colonne Rose Cannelée',
  },
  {
    id: 'cendre-derudit',
    numeral: 'N° II',
    name: "Cendre d'Érudit",
    subtitle: 'Parfum de Bibliothèque & Brume Volcanique',
    category: 'ÉLIXIR FUMÉ & CIRE D’ALCHIMISTE',
    volume: '75 ML · 2.5 FL. OZ.',
    price: 520,
    priceFormatted: '€520',
    allocationCount: '38 / 90 Numérotés',
    image: ELYSIAN_IMAGES.scholarly,
    secondaryImage: ELYSIAN_IMAGES.stillLife,
    imageCrop: '48% 45%',
    secondaryCrop: '14% 62%',
    accentColor: '#F0A824',
    architectureStyle: 'vesuvian-triptych',
    topNotes: ['Fumée Rose du Vésuve', 'Bergamote de Calabre', 'Safran Doré'],
    heartNotes: ['Rose Jaune Ancienne', 'Papyrus & Vélin Chauffé', 'Encre de Noix de Galle'],
    baseNotes: ['Pierre Ponce Volcanique', 'Cèdre Brûlé', 'Ambre Solaire'],
    story:
      'An olfactory treatise written as the mountain erupts. Warm yellow roses and library vellum collide with the mineral electricity of salmon-pink volcanic clouds.',
    vesselMaterial: 'Urne en Laiton Doré brossé & Socle en Marbre Noir Veinée',
  },
  {
    id: 'fleuve-dorphee',
    numeral: 'N° III',
    name: "Fleuve d'Orphée",
    subtitle: 'Eau d’Alchimie Botanique de Haute Vallée',
    category: 'DISTILLATION GLACIAIRE & FLORE D’OR',
    volume: '100 ML · 3.4 FL. OZ.',
    price: 390,
    priceFormatted: '€390',
    allocationCount: '61 / 150 Numérotés',
    image: ELYSIAN_IMAGES.valley,
    secondaryImage: ELYSIAN_IMAGES.temple,
    imageCrop: '52% 55%',
    secondaryCrop: '68% 45%',
    accentColor: '#38BDF8',
    architectureStyle: 'river-diptych',
    topNotes: ['Écume de Torrent Glaciaire', 'Feuille d’Oranger Doré', 'Bourgeon de Cassis'],
    heartNotes: ['Rhododendron Corail', 'Herbe de Prairie Solaire', 'Cyprès Noir'],
    baseNotes: ['Galet Bleu Mouillé', 'Santal Lacté', 'Mousse de Roc'],
    story:
      'Captured where snow-peaks curl into wave-like clouds and azure rapids slice through glowing golden fields. Crisp, hyper-saturated, and dizzyingly luminous.',
    vesselMaterial: 'Flacon Prisme Azur & Médaillon Arbre d’Or Gravé',
  },
  {
    id: 'naos-de-minuit',
    numeral: 'N° IV',
    name: 'Naos de Minuit',
    subtitle: 'Huile Astrale Absolue & Encens Corinthien',
    category: 'ABSOLUE NOCTURNE EN ÉDITION ARCHIVE',
    volume: '30 ML · 1.0 FL. OZ. (FLACON-TEMPLE)',
    price: 680,
    priceFormatted: '€680',
    allocationCount: '19 / 50 Numérotés',
    image: ELYSIAN_IMAGES.temple,
    secondaryImage: ELYSIAN_IMAGES.valley,
    imageCrop: '50% 48%',
    secondaryCrop: '26% 72%',
    accentColor: '#FF6B35',
    architectureStyle: 'naos-keyhole',
    topNotes: ['Badiane Étoilée', 'Sel Nocturne de la Mer Égée', 'Mandarine Ambrée'],
    heartNotes: ['Résine de Corinthe Illuminée', 'Corail Terrestre', 'Jasmin de Nuit'],
    baseNotes: ['Myrrhe Abyssale', 'Benjoin de Siam', 'Poussière Météoritique'],
    story:
      'Born inside the starry doorway of the Six Golden Columns. A nocturnal elixir that glows amber in the dark and leaves a trail of warm resin and celestial cold.',
    vesselMaterial: 'Écrin Fronton Corinthien en Ambre Coulé & Ruban Rose',
  },
];
