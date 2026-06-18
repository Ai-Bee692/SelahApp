import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Note Frequencies ────────────────────────────────────────────────────────
const NOTE_FREQ = {
  'C2': 65.41, 'G2': 98.00, 'A2': 110.00, 'Bb2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59,
  'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81,
  'F3': 174.61, 'F#3': 185.00, 'G3': 196.00,
  'Ab3': 207.65, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18,
  'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63,
  'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'Ab4': 415.30, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88, 'G#4': 415.30,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99,
};

// ─── Chord → Note Mappings ───────────────────────────────────────────────────
const CHORD_NOTES = {
  // ── Major chords ──────────────────────────────────────────────────────────
  'C':   ['C3','G3','E4','G4','C5'],
  'C#':  ['C#3','Ab3','F4','Ab4'],   'Db':  ['C#3','Ab3','F4','Ab4'],
  'D':   ['D3','A3','F#4','A4','D5'],
  'D#':  ['Eb3','Bb3','G4','Bb4'],   'Eb':  ['Eb3','Bb3','G4','Bb4'],
  'E':   ['E3','B3','Ab4','B4'],
  'F':   ['F3','C4','A4','C5'],
  'F#':  ['F#3','C#4','Bb4'],        'Gb':  ['F#3','C#4','Bb4'],
  'G':   ['G3','D4','B4','G5'],
  'G#':  ['Ab3','Eb4','C5'],         'Ab':  ['Ab3','Eb4','C5'],
  'A':   ['A3','C#4','E4','A4'],
  'A#':  ['Bb3','F4','D4','Bb4'],    'Bb':  ['Bb3','F4','D4','Bb4'],
  'B':   ['B3','Eb4','F#4','B4'],
  // ── Minor chords ──────────────────────────────────────────────────────────
  'Cm':  ['C3','Eb3','G3','C4','Eb4'],
  'C#m': ['C#3','E3','Ab3','C#4'],   'Dbm': ['C#3','E3','Ab3','C#4'],
  'Dm':  ['D3','F3','A3','D4'],
  'D#m': ['Eb3','F#3','Bb3','Eb4'],  'Ebm': ['Eb3','F#3','Bb3','Eb4'],
  'Em':  ['E3','G3','B3','E4','G4'],
  'Fm':  ['F3','Ab3','C4','F4'],
  'F#m': ['F#3','A3','C#4','F#4'],   'Gbm': ['F#3','A3','C#4','F#4'],
  'Gm':  ['G3','Bb3','D4','G4'],
  'G#m': ['Ab3','B3','Eb4','Ab4'],   'Abm': ['Ab3','B3','Eb4','Ab4'],
  'Am':  ['A3','C4','E4','A4'],
  'A#m': ['Bb3','Db4','F4','Bb4'],   'Bbm': ['Bb3','Db4','F4','Bb4'],
  'Bm':  ['B3','D4','F#4','B4'],
  // ── 7th chord aliases (AI sometimes adds "7" suffix) ─────────────────────
  'C7':  ['C3','G3','E4','Bb4'],     'G7':  ['G3','D4','F4','B4'],
  'D7':  ['D3','A3','C4','F#4'],     'A7':  ['A3','C#4','G4','E4'],
  'E7':  ['E3','B3','D4','Ab4'],     'F7':  ['F3','C4','Eb4','A4'],
  'Cmaj7': ['C3','G3','B3','E4'],    'Gmaj7': ['G3','D4','F#4','B4'],
  'Fmaj7': ['F3','C4','E4','A4'],    'Amaj7': ['A3','C#4','G#4','E4'],
  'Dm7': ['D3','F3','C4','A4'],      'Em7': ['E3','G3','D4','B4'],
  'Am7': ['A3','C4','G4','E4'],      'Bm7': ['B3','D4','A4','F#4'],
};

// ─── Default BPM per genre ───────────────────────────────────────────────────
export const GENRE_BPM = {
  'Afrobeats':        100,
  'Amapiano':         116,
  'Highlife':          90,
  'Contemporary':      72,
  'Traditional Choral':60,
  'Call & Response':   76,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERCUSSION PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

function kick(ctx, t, vol = 0.85) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.45);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.5);
}

function snare(ctx, t, vol = 0.45) {
  // Noise body
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  src.connect(g); g.connect(ctx.destination); src.start(t);
  // Tonal crack
  const osc = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc.frequency.setValueAtTime(220, t);
  g2.gain.setValueAtTime(vol * 0.4, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(g2); g2.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.07);
}

function hihat(ctx, t, vol = 0.18, open = false) {
  const len = open ? 0.25 : 0.04;
  const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass'; filt.frequency.value = 9000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start(t);
}

function logDrum(ctx, t, vol = 0.9) {
  // Amapiano log drum: sub-bass thump
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(75, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.45);
  // Woody noise click
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(vol * 0.3, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(g2); g2.connect(ctx.destination); src.start(t);
}

function clave(ctx, t, vol = 0.35) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2400, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.05);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUMENT CHORD VOICES
// ═══════════════════════════════════════════════════════════════════════════════

function pianoChord(ctx, notes, t, dur, vol = 0.18) {
  notes.forEach((note, i) => {
    const freq = NOTE_FREQ[note]; if (!freq) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + i * 0.038);
    g.gain.linearRampToValueAtTime(vol, t + i * 0.038 + 0.012);
    g.gain.exponentialRampToValueAtTime(vol * 0.5, t + i * 0.038 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.038 + dur * 0.85);
    g.connect(ctx.destination);
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.038);
    osc.connect(g); osc.start(t + i * 0.038); osc.stop(t + dur);
  });
}

function pianoStab(ctx, notes, t, vol = 0.2) {
  // Short punchy stab — no sustain
  notes.forEach((note, i) => {
    const freq = NOTE_FREQ[note]; if (!freq) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + i * 0.02);
    g.gain.linearRampToValueAtTime(vol, t + i * 0.02 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.02 + 0.2);
    g.connect(ctx.destination);
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.02);
    osc.connect(g); osc.start(t + i * 0.02); osc.stop(t + 0.25);
  });
}

function guitarStrum(ctx, notes, t, dur, vol = 0.18) {
  // Highlife guitar: sawtooth + low-pass = warm string strum
  notes.forEach((note, i) => {
    const freq = NOTE_FREQ[note]; if (!freq) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + i * 0.028);
    g.gain.linearRampToValueAtTime(vol, t + i * 0.028 + 0.005);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t + i * 0.028 + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.028 + dur * 0.7);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 1800;
    filt.connect(g); g.connect(ctx.destination);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t + i * 0.028);
    osc.connect(filt); osc.start(t + i * 0.028); osc.stop(t + dur);
  });
}

function organChord(ctx, notes, t, dur, vol = 0.12) {
  // Traditional Choral organ: additive sine harmonics, slow attack
  notes.forEach((note) => {
    const freq = NOTE_FREQ[note]; if (!freq) return;
    [1, 2, 3, 4, 6].forEach((harmonic, hi) => {
      const hVol = vol / (hi + 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(hVol, t + 0.08); // slow organ attack
      g.gain.setValueAtTime(hVol, t + dur - 0.1);
      g.gain.linearRampToValueAtTime(0, t + dur);
      g.connect(ctx.destination);
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * harmonic, t);
      osc.connect(g); osc.start(t); osc.stop(t + dur + 0.05);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENRE BAR SCHEDULERS (1 bar = 4 beats)
// ═══════════════════════════════════════════════════════════════════════════════

function scheduleAfrobeats(ctx, notes, t, spb) {
  // spb = seconds per beat
  // Kick: 1, "and of 2", 3 | Snare: 2, 4 | Hi-hat: every 8th
  kick(ctx, t);
  kick(ctx, t + spb * 1.5);
  kick(ctx, t + spb * 2);
  snare(ctx, t + spb);
  snare(ctx, t + spb * 3);
  for (let i = 0; i < 8; i++) hihat(ctx, t + i * spb * 0.5, 0.12 + (i % 2 === 0 ? 0.06 : 0));
  // Clave pattern: 1, and-of-2, and-of-3
  clave(ctx, t);
  clave(ctx, t + spb * 1.5);
  clave(ctx, t + spb * 2.5);
  // Short piano stabs on beats 1 and 3
  pianoStab(ctx, notes, t, 0.22);
  pianoStab(ctx, notes, t + spb * 2, 0.22);
}

function scheduleAmapiano(ctx, notes, t, spb) {
  // Log drum on 1 and 3; hi-hat rolls; piano on 2 and 4
  logDrum(ctx, t);
  logDrum(ctx, t + spb * 2);
  // Hi-hat: 16th note rolls
  for (let i = 0; i < 16; i++) hihat(ctx, t + i * spb * 0.25, 0.1 + (i % 4 === 0 ? 0.08 : 0));
  // Snare on 3
  snare(ctx, t + spb * 2, 0.3);
  // Piano chords: floating on 2 and 4 (the Amapiano "log piano" feel)
  pianoChord(ctx, notes, t + spb, spb * 1.8, 0.16);
  pianoChord(ctx, notes, t + spb * 3, spb * 0.8, 0.16);
}

function scheduleHighlife(ctx, notes, t, spb) {
  // Guitar strums on all 4 beats with syncopation
  guitarStrum(ctx, notes, t, spb, 0.18);
  guitarStrum(ctx, notes, t + spb * 0.75, spb * 0.5, 0.12); // syncopated offbeat
  guitarStrum(ctx, notes, t + spb * 1.5, spb, 0.18);
  guitarStrum(ctx, notes, t + spb * 2, spb, 0.16);
  guitarStrum(ctx, notes, t + spb * 3, spb, 0.18);
  // Clave pattern typical of Highlife
  clave(ctx, t, 0.25);
  clave(ctx, t + spb * 0.5, 0.18);
  clave(ctx, t + spb * 1.5, 0.25);
  clave(ctx, t + spb * 2.5, 0.18);
  clave(ctx, t + spb * 3, 0.25);
  // Light hi-hats
  for (let i = 0; i < 8; i++) hihat(ctx, t + i * spb * 0.5, 0.1);
}

function scheduleContemporary(ctx, notes, t, spb, barDur) {
  // Modern Worship: clean piano strum on 1, touches on 2, 3, 4
  pianoChord(ctx, notes, t, barDur, 0.18);
  // Light metronome
  for (let b = 0; b < 4; b++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(b === 0 ? 1200 : 900, t + b * spb);
    g.gain.setValueAtTime(b === 0 ? 0.2 : 0.1, t + b * spb);
    g.gain.exponentialRampToValueAtTime(0.001, t + b * spb + 0.04);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t + b * spb); osc.stop(t + b * spb + 0.05);
  }
}

function scheduleChoralOrgan(ctx, notes, t, spb, barDur) {
  // Majestic organ — full sustain, no drums, pure harmony
  organChord(ctx, notes, t, barDur, 0.13);
  // Soft "breath" click on beat 1 only
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(800, t);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.07);
}

function scheduleCallResponse(ctx, notes, t, spb, barDur) {
  // Sparse — piano plays on beats 1 and 3, leaves space for vocals
  pianoChord(ctx, notes, t, spb * 1.5, 0.16);
  pianoChord(ctx, notes, t + spb * 2, spb * 1.5, 0.16);
  // Soft clave on every beat to keep time
  for (let b = 0; b < 4; b++) clave(ctx, t + b * spb, 0.2);
  // Occasional snare on 3 for feel
  snare(ctx, t + spb * 2, 0.25);
}

// ─── Master dispatcher ───────────────────────────────────────────────────────
function scheduleBar(ctx, chordName, t, bpm, genre) {
  const spb    = 60.0 / bpm;
  const barDur = spb * 4;
  const notes  = CHORD_NOTES[chordName] || CHORD_NOTES['C'];

  switch (genre) {
    case 'Afrobeats':          scheduleAfrobeats(ctx, notes, t, spb);               break;
    case 'Amapiano':           scheduleAmapiano(ctx, notes, t, spb);                break;
    case 'Highlife':           scheduleHighlife(ctx, notes, t, spb);                break;
    case 'Traditional Choral': scheduleChoralOrgan(ctx, notes, t, spb, barDur);     break;
    case 'Call & Response':    scheduleCallResponse(ctx, notes, t, spb, barDur);    break;
    case 'Contemporary':
    default:                   scheduleContemporary(ctx, notes, t, spb, barDur);    break;
  }

  return barDur;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE HOOK
// ═══════════════════════════════════════════════════════════════════════════════
export function useGospelAudio(chords = [], genre = 'Contemporary') {
  const defaultBpm = GENRE_BPM[genre] || 72;
  const [isPlaying, setIsPlaying]           = useState(false);
  const [currentChordIdx, setCurrentChordIdx] = useState(0);
  const [bpm, setBpmState]                  = useState(defaultBpm);

  const ctxRef       = useRef(null);
  const schedulerRef = useRef(null);
  const nextTimeRef  = useRef(0);
  const chordIdxRef  = useRef(0);
  const isPlayingRef = useRef(false);
  const bpmRef       = useRef(defaultBpm);
  const chordsRef    = useRef(chords);
  const genreRef     = useRef(genre);

  useEffect(() => { chordsRef.current = chords; }, [chords]);
  useEffect(() => { genreRef.current  = genre;  }, [genre]);

  // Reset BPM when genre changes
  useEffect(() => {
    const d = GENRE_BPM[genre] || 72;
    bpmRef.current = d;
    setBpmState(d);
  }, [genre]);

  const setBpm = (val) => { bpmRef.current = val; setBpmState(val); };

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  const runScheduler = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = ctxRef.current;
    while (nextTimeRef.current < ctx.currentTime + 0.35) {
      const idx  = chordIdxRef.current;
      const time = nextTimeRef.current;
      const dur  = scheduleBar(ctx, chordsRef.current[idx % (chordsRef.current.length || 1)], time, bpmRef.current, genreRef.current);
      const delay = Math.max(0, (time - ctx.currentTime) * 1000);
      setTimeout(() => {
        if (isPlayingRef.current) setCurrentChordIdx(idx % (chordsRef.current.length || 1));
      }, delay);
      chordIdxRef.current = (idx + 1) % (chordsRef.current.length || 1);
      nextTimeRef.current += dur;
    }
    schedulerRef.current = setTimeout(runScheduler, 60);
  }, []);

  const play = useCallback(() => {
    const ctx = getCtx();
    isPlayingRef.current = true;
    nextTimeRef.current  = ctx.currentTime + 0.05;
    setIsPlaying(true);
    runScheduler();
  }, [runScheduler]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    clearTimeout(schedulerRef.current);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    clearTimeout(schedulerRef.current);
    chordIdxRef.current  = 0;
    nextTimeRef.current  = 0;
    setIsPlaying(false);
    setCurrentChordIdx(0);
  }, []);

  useEffect(() => () => {
    clearTimeout(schedulerRef.current);
    isPlayingRef.current = false;
  }, []);

  return { isPlaying, currentChordIdx, bpm, setBpm, play, pause, stop };
}
