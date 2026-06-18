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
];

export const LANGS = ["English", "Pidgin", "Yoruba", "Igbo", "Hausa"];

export const GENRES = [
  { icon: "🥁", label: "Afrobeats" },
  { icon: "🎹", label: "Amapiano" },
  { icon: "🎺", label: "Highlife" },
  { icon: "🎸", label: "Contemporary" },
  { icon: "🎼", label: "Traditional Choral" },
  { icon: "🎤", label: "Call & Response" },
];

export const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export const MOCK_SONGS = [
  {
    id: 1,
    title: "Ese O Baba",
    genre: "Afrobeats",
    lang: "Yoruba",
    theme: "Thanksgiving",
    scripture: "Psalm 100:4",
    lyrics: [
      { part: "All", line: "Ese o Baba, wa dupe / Enter His gates with thanksgiving" },
      { part: "Leader", line: "Ẹ jẹ ká gbọ̀ ọpẹ, ẹ jẹ ká yin Olúwa" },
      { part: "Choir", line: "Ese o! Ese o! Hallelujah!" },
      { part: "All", line: "Ìyanu rẹ ga ju ìgbàgbọ́ wa lọ" },
    ],
  },
  {
    id: 2,
    title: "God Grace Wey We No Work For",
    genre: "Contemporary",
    lang: "Pidgin",
    theme: "Grace",
    scripture: "Ephesians 2:8-9",
    lyrics: [
      { part: "Verse", line: "E no be by my power, e no be by my might" },
      { part: "Verse", line: "Na God grace carry me reach dis height" },
      { part: "Chorus", line: "God grace wey we no work for / That na the grace wey save my soul" },
      { part: "Leader", line: "Say thank you Lord, e no fit enter inside one mouth" },
      { part: "Choir", line: "Thank you! Thank you! Thank you Lord!" },
    ],
  },
  {
    id: 3,
    title: "Chineke — You Are Faithful",
    genre: "Highlife",
    lang: "Igbo",
    theme: "Faithfulness",
    scripture: "Lamentations 3:23",
    lyrics: [
      { part: "All", line: "Chineke, ihe ịhụnanya gị dị ukwuu / Your mercies are new every morning" },
      { part: "Leader", line: "Onye zuo ihe ọ bụla nke ọma mere anyi" },
      { part: "Choir", line: "Amen! Amen! Imela Chineke!" },
    ],
  },
];
