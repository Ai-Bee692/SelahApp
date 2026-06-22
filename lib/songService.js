/**
 * Unified song service — reads from Supabase when online, falls back to IndexedDB.
 * All writes go to both so the library works offline.
 */

import { supabase } from "./supabase";
import {
  getAllSongs as idbGetAll,
  getSong as idbGetSong,
  saveSong as idbSaveSong,
  deleteSong as idbDeleteSong,
} from "./indexedDb";

const SUPABASE_READY =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co";

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

export async function getSession() {
  if (!SUPABASE_READY) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export async function getUser() {
  if (!SUPABASE_READY) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/` },
  });
}

export async function signInWithEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// ─── Song CRUD ────────────────────────────────────────────────────────────────

/**
 * Save a song locally and to Supabase if authenticated.
 * @param {Object} song
 * @returns {Object} saved song (with id from Supabase or local)
 */
export async function saveSong(song) {
  // Always cache locally first
  await idbSaveSong(song);

  if (!SUPABASE_READY) return song;

  const user = await getUser();
  if (!user) return song;

  const payload = {
    user_id: user.id,
    title: song.title,
    genre: song.genre,
    music_key: song.musicKey,
    lang: song.lang,
    theme: song.theme,
    scripture: song.scripture,
    lyrics: song.lyrics,
    chords: song.chords,
    emotional_mode: song.emotional_mode,
    instrumentation: song.instrumentation,
    vocal_gender: song.vocal_gender,
    audio_url: song.audio_url ?? null,
    tracks: song.tracks ?? null,
    ai_source: song.ai_source ?? null,
    is_public: song.is_public ?? true,
  };

  // If song has a Supabase-issued id (numeric > 1e12 is an IndexedDB id, not Supabase)
  if (song.supabase_id) {
    const { data, error } = await supabase
      .from("songs")
      .update(payload)
      .eq("id", song.supabase_id)
      .select()
      .single();
    if (!error && data) return { ...song, supabase_id: data.id };
  } else {
    const { data, error } = await supabase
      .from("songs")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      const merged = { ...song, supabase_id: data.id };
      await idbSaveSong(merged);
      return merged;
    }
  }

  return song;
}

/**
 * Get all songs for the current user.
 * Falls back to IndexedDB when offline or unauthenticated.
 */
export async function getAllSongs() {
  if (!SUPABASE_READY) return idbGetAll();

  const user = await getUser();
  if (!user) return idbGetAll();

  try {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const normalized = (data || []).map(normalizeSupabaseSong);
    // Warm the local cache
    for (const song of normalized) {
      await idbSaveSong(song).catch(() => {});
    }
    return normalized;
  } catch {
    return idbGetAll();
  }
}

/**
 * Get a single song by its local id.
 * Tries IndexedDB first (fast path), then Supabase.
 */
export async function getSong(localId) {
  const local = await idbGetSong(localId);
  if (local) return local;

  if (!SUPABASE_READY) return null;

  // Try fetching by supabase_id if localId looks like a Supabase bigint
  const { data } = await supabase
    .from("songs")
    .select("*")
    .eq("id", localId)
    .single();

  return data ? normalizeSupabaseSong(data) : null;
}

export async function deleteSong(localId, supabaseId) {
  await idbDeleteSong(localId);
  if (supabaseId && SUPABASE_READY) {
    await supabase.from("songs").delete().eq("id", supabaseId);
  }
}

// ─── Community Feed ───────────────────────────────────────────────────────────

export async function getPublicSongs() {
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase
    .from("songs")
    .select("*, song_likes(count)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (data || []).map(normalizeSupabaseSong);
}

export async function publishSong(supabaseId) {
  if (!SUPABASE_READY) return;
  await supabase.from("songs").update({ is_public: true }).eq("id", supabaseId);
}

export async function unpublishSong(supabaseId) {
  if (!SUPABASE_READY) return;
  await supabase.from("songs").update({ is_public: false }).eq("id", supabaseId);
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function getLikesForSong(supabaseId) {
  if (!SUPABASE_READY || !supabaseId) return { count: 0, userLiked: false };
  const user = await getUser();
  const { count } = await supabase
    .from("song_likes")
    .select("*", { count: "exact", head: true })
    .eq("song_id", supabaseId);

  let userLiked = false;
  if (user) {
    const { data } = await supabase
      .from("song_likes")
      .select("id")
      .eq("song_id", supabaseId)
      .eq("user_id", user.id)
      .single();
    userLiked = !!data;
  }
  return { count: count ?? 0, userLiked };
}

export async function toggleLike(supabaseId) {
  if (!SUPABASE_READY || !supabaseId) return;
  const user = await getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("song_likes")
    .select("id")
    .eq("song_id", supabaseId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("song_likes").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase
      .from("song_likes")
      .insert({ song_id: supabaseId, user_id: user.id });
    return true;
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function normalizeSupabaseSong(row) {
  return {
    id: row.id,
    supabase_id: row.id,
    title: row.title,
    genre: row.genre,
    musicKey: row.music_key,
    lang: row.lang,
    theme: row.theme,
    scripture: row.scripture,
    lyrics: row.lyrics ?? [],
    chords: row.chords ?? [],
    emotional_mode: row.emotional_mode,
    instrumentation: row.instrumentation,
    vocal_gender: row.vocal_gender,
    audio_url: row.audio_url,
    tracks: row.tracks,
    ai_source: row.ai_source,
    is_public: row.is_public ?? true,
    created_at: new Date(row.created_at).getTime(),
    like_count: row.song_likes?.[0]?.count ?? 0,
  };
}
