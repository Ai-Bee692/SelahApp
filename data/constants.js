export const C = {
  bg: "#0D1117",
  surface: "#161B22",
  card: "#1C2230",
  border: "#2D3748",
  green: "#1DB954",
  greenDim: "#145A32",
  greenLight: "#23D45E",
  text: "#E6EDF3",
  muted: "#8B949E",
  accent: "#F0FFF4",
};

export const THEMES = [
  "Thanksgiving", "Grace", "Warfare", "Faithfulness",
  "The Cross", "Healing", "Holy Spirit", "Communion",
  "Restoration", "Victory", "Surrender", "Revival",
];

export const LANGS = ["English", "Pidgin", "Yoruba", "Igbo", "Hausa"];

export const GENRES = [
  {
    icon: "🥁",
    label: "Afrobeats",
    description: "Talking drum, electric guitar, driving Afro-gospel percussion",
  },
  {
    icon: "🎹",
    label: "Amapiano",
    description: "South African log drum bass, lilting piano riffs, rich choir",
  },
  {
    icon: "🎺",
    label: "Highlife",
    description: "West African brass, acoustic guitar strum, joyful ensemble",
  },
  {
    icon: "🎸",
    label: "Contemporary",
    description: "Modern worship band: piano, organ, light percussion, choir",
  },
  {
    icon: "🎼",
    label: "Traditional Choral",
    description: "A cappella SATB choir, slow and reverent, no drums",
  },
  {
    icon: "🎤",
    label: "Call & Response",
    description: "Leader/choir antiphony, hand claps, organ, celebratory",
  },
  {
    icon: "🪘",
    label: "Fuji Gospel",
    description: "Yoruba talking drum, sakara percussion, jubilant lead vocal",
  },
  {
    icon: "✨",
    label: "Praise & Worship",
    description: "Elevation/Hillsong style: keys, electric guitar, full choir build",
  },
];

export const EMOTIONAL_MODES = [
  {
    val: "lament_comfort",
    label: "Lament & Comfort",
    icon: "🕯️",
    description: "Slow/moderate piano, gentle strings — comfort sitting with pain rather than rushing past it.",
  },
  {
    val: "triumph_declaration",
    label: "Triumph & Declaration",
    icon: "🗣️",
    description: "Driving mid-to-up tempo, full gospel band with horns/organ, confident lead shouting testimony.",
  },
  {
    val: "rest_surrender",
    label: "Rest & Surrender",
    icon: "🕊️",
    description: "Very slow, ambient/sparse, single sustained vocal/duet, soft pads — stillness where nothing fights for attention.",
  },
  {
    val: "wonder_intimacy",
    label: "Wonder & Intimacy",
    icon: "💝",
    description: "Mid tempo, acoustic guitar/fingerpicked piano anchor, close-mic'd vocal — quiet personal prayer.",
  },
  {
    val: "joy_celebration",
    label: "Joy & Celebration",
    icon: "🎉",
    description: "Up-tempo highlife-gospel groove, syncopated percussion, call-and-response — congregation on its feet.",
  },
  {
    val: "defiance_warfare",
    label: "Defiance & Warfare",
    icon: "⚔️",
    description: "Urgent, percussive, militant rhythm, layered chant-like choir — standing your ground, not asking permission.",
  },
];

export const INSTRUMENTATION_MODIFIERS = [
  {
    val: "full_band",
    label: "Full Gospel Band",
    icon: "🥁",
    description: "Piano, bass, drums, guitar, with horns or strings where the mode calls for it.",
  },
  {
    val: "vocal_piano",
    label: "Vocal & Piano",
    icon: "🎹",
    description: "Stripped to lead vocal and piano only — intimate and exposed.",
  },
  {
    val: "a_cappella",
    label: "A Cappella Choir",
    icon: "👥",
    description: "Voices only, choir harmony carrying the full arrangement without instruments.",
  },
  {
    val: "instrumental",
    label: "Instrumental Only",
    icon: "🎼",
    description: "No vocals — the emotional mode carried entirely by the musical arrangement.",
  },
];

export const VOCAL_LEADS = [
  { val: "f", label: "Female Lead", icon: "👩" },
  { val: "m", label: "Male Lead", icon: "👨" },
  { val: "mixed", label: "Mixed / Both", icon: "🎤" },
];

export const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

// Demo songs are disabled — the real system generates all content via Groq AI.
// To re-enable for demos, uncomment the objects inside this array.
export const MOCK_SONGS = [];

