function truncateAtWordBoundary(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace !== -1) {
    return truncated.substring(0, lastSpace).trim();
  }
  return truncated.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { theme, musicKey, langs, genre, harmony, scripture, rawSongText, emotional_mode, instrumentation, vocal_gender } = req.body;

  // Set in stone character length limits for parameters used in Groq prompts, using word-boundary truncation
  const cleanTheme = truncateAtWordBoundary(theme || "", 100);
  const cleanScripture = truncateAtWordBoundary(scripture || "", 500);
  const cleanRawSongText = truncateAtWordBoundary(rawSongText || "", 4000);

  // Read all available Groq keys for rotation
  const groqKeys = [];
  if (process.env.GROQ_API_KEY) groqKeys.push(process.env.GROQ_API_KEY);
  if (process.env.GROQ_API_KEY_2) groqKeys.push(process.env.GROQ_API_KEY_2);
  if (process.env.GROQ_API_KEY_3) groqKeys.push(process.env.GROQ_API_KEY_3);
  if (process.env.GROQ_API_KEY_4) groqKeys.push(process.env.GROQ_API_KEY_4);

  // Helper: return a rich mock song so the UI never breaks
  const mockSong = () => {
    const defaultSections = [
      {
        part: "Intro",
        lyrics: ["(Instrumental Intro)"],
        chords: buildChords(musicKey),
        arrangement: { dynamics: "piano", percussion: "mute" }
      },
      {
        part: "Verse 1",
        lyrics: [
          `Lord, we lift our hearts in ${cleanTheme || "worship"} today`,
          "Every breath we breathe, Your mercies never fade away"
        ],
        chords: buildChords(musicKey),
        arrangement: { dynamics: "mezzo", percussion: "rimshot" }
      },
      {
        part: "Chorus",
        lyrics: [
          "Hallelujah! Worthy is the Lamb!",
          "All the glory, honour, power — praise His name!"
        ],
        chords: buildChords(musicKey),
        arrangement: { dynamics: "forte", percussion: "full" }
      },
      {
        part: "Bridge",
        lyrics: [
          "(Leader) He is worthy — (Choir) Worthy!",
          "(Leader) He is able — (Choir) Able!"
        ],
        chords: buildChords(musicKey),
        arrangement: { dynamics: "forte", percussion: "heavy" }
      },
      {
        part: "Tag",
        lyrics: [
          "Praise the Lord, praise the Lord, praise His holy name"
        ],
        chords: buildChords(musicKey),
        arrangement: { dynamics: "piano", percussion: "light" }
      }
    ];

    const flatLyrics = [];
    defaultSections.forEach(section => {
      const chordsPerLine = Math.max(1, Math.ceil(section.chords.length / section.lyrics.length));
      section.lyrics.forEach((line, li) => {
        const start = li * chordsPerLine;
        const end = Math.min(start + chordsPerLine, section.chords.length);
        const lineChords = section.chords.slice(start, end);
        flatLyrics.push({
          part: section.part,
          line: line,
          chords: lineChords.length > 0 ? lineChords : [section.chords[section.chords.length - 1]],
          arrangement: section.arrangement
        });
      });
    });

    return {
      title: `${cleanTheme || "Grace"} (Key of ${musicKey})`,
      scripture: cleanScripture || "Psalm 150:6",
      lyrics: flatLyrics,
      chords: flatLyrics.flatMap(l => l.chords),
    };
  };

  if (groqKeys.length === 0) {
    console.log("⚠️  No GROQ_API_KEY found. Returning mock song.");
    return res.status(200).json(mockSong());
  }

  const modeLabel = {
    lament_comfort: "Lament & Comfort (Slow/moderate piano-led, gentle strings, comfort that sits with pain)",
    triumph_declaration: "Triumph & Declaration (Driving mid-to-up tempo, full gospel band with horns/organ, confident testimony)",
    rest_surrender: "Rest & Surrender (Very slow, ambient, stillness, soft pads)",
    wonder_intimacy: "Wonder & Intimacy (Mid tempo, acoustic/piano anchor, close-mic'd vocal)",
    joy_celebration: "Joy & Celebration (Up-tempo highlife-gospel groove, syncopated, congregation on feet)",
    defiance_warfare: "Defiance & Warfare (Urgent percussive rhythm, layered chant choir, standing ground)",
  }[emotional_mode] || "worshipful";

  const instLabel = {
    full_band: "Full gospel band arrangement (piano, bass, drums, guitar, horns/strings)",
    vocal_piano: "Stripped to lead vocal and piano only",
    a_cappella: "A cappella (voices only, choir harmony, no instruments)",
    instrumental: "Instrumental only, no vocals",
  }[instrumentation] || "full band with choir harmonies";

  const vocalLabel = {
    f: "a warm female lead vocalist",
    m: "a powerful male lead vocalist",
    mixed: "male and female vocalists sharing the lead",
  }[vocal_gender] || "a gospel lead vocalist";

  const scriptureTranslationRule = cleanScripture
    ? `Since you are writing the song based on the scripture reference/passage: "${cleanScripture}" and the emotional mode: "${modeLabel}", do not quote the passage directly. Follow these instructions:
1. Identify the central promise or truth in the passage.
2. Translate it into first-person testimony — what a worshipper would sing as their own prayer, not a third-person description of the verse.
3. Build the verse(s) around the human context or struggle the truth speaks into.
4. Build the chorus around the declared truth itself — simple, repeatable, singable by a congregation on first hearing.
5. If a bridge is appropriate, write a moment of surrender or breakthrough — the emotional peak of the song.
6. Use natural Nigerian Pidgin phrasing welcome where it adds authenticity — write it as it would actually be sung, not translated English.`
    : `Please base the song generally on the theme: ${cleanTheme || 'Grace'}. Make sure the lyrics follow a gospel structure and remain scripture-true in phrasing.`;

  const prompt = cleanRawSongText
    ? `You are an expert Music Director and Choral Arranger.
Task: Analyze and structure the following existing raw song lyrics and chords into choir practice parts:
"${cleanRawSongText}"

Rules:
1. Identify the Title and a relevant Scriptural Anchor for this song.
2. Segment the lines cleanly into parts (e.g., Intro, Verse 1, Chorus, Verse 2, Bridge, Tag, Outro).
3. If chords are written in the input text, extract them. If not, suggest a solid gospel chord progression in the key of ${musicKey}.
4. Mark any call-and-response lines with (Leader) or (Choir) prefix on the lyric line.
5. Return ONLY valid JSON (absolutely no markdown, no code fences, no extra text), in this exact shape:
{
  "title": "Song Title Here",
  "scripture": "Book Chapter:Verse",
  "sections": [
    {
      "part": "Intro",
      "lyrics": ["(Instrumental Intro)"],
      "chords": ["Chord1", "Chord2"],
      "arrangement": {"dynamics": "piano", "percussion": "mute"},
      "production_notes": "sparse opening, no vocals yet"
    },
    {
      "part": "Verse 1",
      "lyrics": ["Lyric line 1 here", "Lyric line 2 here"],
      "chords": ["Chord1", "Chord2", "Chord3", "Chord4"],
      "arrangement": {"dynamics": "mezzo", "percussion": "rimshot"},
      "production_notes": "gentle verse, build towards chorus"
    },
    {
      "part": "Chorus",
      "lyrics": ["(Leader) He is worthy!", "(Choir) Worthy!"],
      "chords": ["Chord1", "Chord2", "Chord3", "Chord4"],
      "arrangement": {"dynamics": "forte", "percussion": "full"},
      "production_notes": "full energy, choir at maximum, call-and-response"
    }
  ]
}`
    : `You are an expert African Gospel Songwriter and Music Theorist.
Task: Write a full gospel song based on the following parameters:
- Theme: ${cleanTheme}
- Key: ${musicKey}
- Languages: ${langs ? langs.join(', ') : 'English'} (Use natural code-switching where appropriate)
- Genre: ${genre}
- Scripture Anchor: ${cleanScripture || 'Choose a relevant scripture'}
- Song Emotional Mode: ${modeLabel}
- Instrumentation/Arrangement: ${instLabel}
- Vocal Lead: ${vocalLabel}

Scripture Translation Guidance:
${scriptureTranslationRule}

Rules:
1. Structure MUST follow a full multi-section arrangement: Intro, Verse 1, Chorus, Verse 2, Chorus, Bridge, Tag, Outro.
2. Include call-and-response (Leader / Choir) elements naturally in the Chorus and Bridge — mark these lines with (Leader) or (Choir) prefix on the lyric text.
3. Use cultural African gospel idioms (e.g., "Oluwa", "Ese o", "Chineke", "Testimony", "Hallelujah", "Imela", "Nara ekele") where language allows.
4. Suggest solid gospel chord progressions in the key of ${musicKey}. Ensure the Chorus and Bridge sections feel musically distinct from the Verses.
5. For each section include a "production_notes" string describing emotional/instrumental feel for that section (e.g. "slow piano intro, no choir yet, lament posture" or "full choir explodes, driving highlife groove, joyful celebration").
6. The Intro section lyrics should be ["(Instrumental Intro)"] only.

Return ONLY valid JSON (absolutely no markdown, no code fences, no extra text), in this exact shape:
{
  "title": "Song Title Here",
  "scripture": "Book Chapter:Verse",
  "sections": [
    {
      "part": "Intro",
      "lyrics": ["(Instrumental Intro)"],
      "chords": ["Chord1", "Chord2"],
      "arrangement": {"dynamics": "piano", "percussion": "mute"},
      "production_notes": "sparse opening, single piano, no choir"
    },
    {
      "part": "Verse 1",
      "lyrics": ["Lyric line 1", "Lyric line 2"],
      "chords": ["Chord1", "Chord2", "Chord3", "Chord4"],
      "arrangement": {"dynamics": "mezzo", "percussion": "rimshot"},
      "production_notes": "intimate verse, lead vocal only, gentle percussion begins"
    },
    {
      "part": "Chorus",
      "lyrics": ["(Leader) He is worthy!", "(Choir) Worthy! Hallelujah!"],
      "chords": ["Chord1", "Chord2", "Chord3", "Chord4"],
      "arrangement": {"dynamics": "forte", "percussion": "full"},
      "production_notes": "full choir erupts, driving percussion, call-and-response antiphony"
    }
  ]
}`;

  let responseData = null;
  let lastError = null;

  for (const key of groqKeys) {
    try {
      console.log(`Trying Groq API key: ${key.substring(0, 12)}...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are an expert African Gospel Songwriter. You always respond with valid JSON only. No markdown. No explanation. Just the JSON object.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.85,
          max_tokens: 1500,
        })
      });

      const responseStatus = response.status;
      const data = await response.json();

      console.log(`Groq API key ${key.substring(0, 12)}... status:`, responseStatus);

      if (responseStatus === 200 && !data.error) {
        responseData = data;
        break;
      } else {
        const errMsg = data.error ? data.error.message : `HTTP ${responseStatus}`;
        console.warn(`⚠️ Key ${key.substring(0, 12)}... failed: ${errMsg}`);
        lastError = new Error(errMsg);
      }
    } catch (e) {
      console.warn(`⚠️ Key ${key.substring(0, 12)}... threw error:`, e.message);
      lastError = e;
    }
  }

  if (!responseData) {
    console.error("❌ All Groq API keys failed. Last error:", lastError ? lastError.message : "unknown");
    return res.status(200).json(mockSong());
  }

  try {
    const data = responseData;

    const rawText = data.choices[0].message.content.trim();
    console.log("🎵 Groq raw response:", rawText);

    const cleaned = rawText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const flatLyrics = [];
    if (parsed.sections && Array.isArray(parsed.sections)) {
      parsed.sections.forEach(section => {
        const lyricsList = section.lyrics || [""];
        const chordsList = section.chords || ["G"];
        const chordsPerLine = Math.max(1, Math.ceil(chordsList.length / lyricsList.length));
        
        lyricsList.forEach((line, li) => {
          const start = li * chordsPerLine;
          const end = Math.min(start + chordsPerLine, chordsList.length);
          const lineChords = chordsList.slice(start, end);
          flatLyrics.push({
            part: section.part || "Section",
            line: line,
            chords: lineChords.length > 0 ? lineChords : [chordsList[chordsList.length - 1] || "G"],
            arrangement: section.arrangement || { dynamics: "mezzo", percussion: "full" }
          });
        });
      });
    }

    const flatChords = flatLyrics.flatMap(l => l.chords);

    console.log("🎶 Successfully generated structured gospel song:", parsed.title);
    return res.status(200).json({
      title: parsed.title,
      scripture: parsed.scripture,
      lyrics: flatLyrics,
      chords: flatChords,
      genre: genre,
      emotional_mode: emotional_mode || null,
      instrumentation: instrumentation || null,
      vocal_gender: vocal_gender || null,
    });

  } catch (error) {
    console.error("❌ Error generating song:", error.message);
    return res.status(200).json(mockSong());
  }
}

// Builds a gospel 1-4-5-6 chord progression for any root key
function buildChords(root) {
  const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const idx = NOTES.indexOf(root);
  if (idx === -1) return [root, "F", "G", "Am"];
  const I  = NOTES[idx];
  const IV = NOTES[(idx + 5) % 12];
  const V  = NOTES[(idx + 7) % 12];
  const VI = NOTES[(idx + 9) % 12] + "m";
  return [I, IV, V, VI];
}
