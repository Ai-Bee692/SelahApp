export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { theme, musicKey, langs, genre, harmony, scripture } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // Helper: return a rich mock song so the UI never breaks
  const mockSong = () => ({
    title: `${theme} (Key of ${musicKey})`,
    scripture: scripture || `Psalm 150:6`,
    chords: buildChords(musicKey),
    lyrics: [
      { part: "Verse 1",  line: `Lord, we lift our hearts in ${theme.toLowerCase()} today` },
      { part: "Verse 1",  line: `Every breath we breathe, Your mercies never fade away` },
      { part: "Chorus",   line: `Hallelujah! Worthy is the Lamb!` },
      { part: "Chorus",   line: `All the glory, honour, power — praise His name!` },
      { part: "Verse 2",  line: `From the rising of the sun to the going down thereof` },
      { part: "Verse 2",  line: `Your ${theme.toLowerCase()} endures, unchanging is Your love` },
      { part: "Bridge",   line: `(Leader) He is worthy — (Choir) Worthy!` },
      { part: "Bridge",   line: `(Leader) He is able — (Choir) Able!` },
      { part: "Tag",      line: `Praise the Lord, praise the Lord, praise His holy name` },
    ],
  });

  if (!GROQ_API_KEY) {
    console.log("⚠️  No GROQ_API_KEY found. Returning mock song.");
    return res.status(200).json(mockSong());
  }

  const prompt = `You are an expert African Gospel Songwriter and Music Theorist.
Task: Write a gospel song based on the following parameters:
- Theme: ${theme}
- Key: ${musicKey}
- Languages: ${langs.join(', ')} (Use natural code-switching where appropriate)
- Genre: ${genre}
- Scripture Anchor: ${scripture || 'Choose a relevant scripture'}

Rules:
1. Structure MUST follow: Verse 1, Chorus, Verse 2, Bridge, Tag.
2. Include call-and-response (Leader / Choir) elements naturally.
3. Use cultural African gospel idioms (e.g., "Oluwa", "Ese o", "Chineke", "Testimony", "Hallelujah", "Imela") where language allows.
4. Suggest exactly 4 chords as a gospel 1-4-5-6 progression in the key of ${musicKey}.
5. Each lyric line should be singable, rhythmic, and biblically grounded.

Return ONLY valid JSON (absolutely no markdown, no code fences, no extra text), in this exact shape:
{
  "title": "Song Title Here",
  "scripture": "Book Chapter:Verse",
  "chords": ["Chord1", "Chord2", "Chord3", "Chord4"],
  "lyrics": [
    {"part": "Verse 1", "line": "Lyric line here"},
    {"part": "Verse 1", "line": "Second line of verse 1"},
    {"part": "Chorus",  "line": "Chorus lyric here"},
    {"part": "Chorus",  "line": "Second chorus line"},
    {"part": "Verse 2", "line": "Verse 2 lyric here"},
    {"part": "Bridge",  "line": "(Leader) Line — (Choir) Response"},
    {"part": "Tag",     "line": "Closing tag line"}
  ]
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
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

    const data = await response.json();

    console.log("✅ Groq API status:", response.status);

    if (data.error) {
      console.error("❌ Groq API Error:", data.error.message);
      return res.status(200).json(mockSong());
    }

    const rawText = data.choices[0].message.content.trim();
    console.log("🎵 Groq raw response:", rawText);

    // Strip any accidental markdown code fences just in case
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    console.log("🎶 Successfully generated gospel song:", parsed.title);
    return res.status(200).json(parsed);

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
