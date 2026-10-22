import type { LyricData, SongResult } from '../../../types';
import { parseLyricsByFormat } from '../parserCore';
import { hasRenderableLyrics } from '../validity';
import type { LyricMatchSearchTarget } from '../lyricMatchSources';

// src/utils/lyrics/providers/lrclibProvider.ts
// LRCLIB (lrclib.net), a public lyrics library with a free keyless API: the lyric source of
// last resort, and the only remote one a build without platform providers can reach. Its
// lyrics are line-timed LRC; identification is best-effort and every failure is a quiet miss.

const LRCLIB_API_BASE = 'https://lrclib.net/api';
const LRCLIB_MAX_RESULTS = 20;

interface LrclibTrack {
    id: number;
    trackName?: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
    instrumental?: boolean;
    syncedLyrics?: string | null;
    plainLyrics?: string | null;
}

const fetchLrclibJson = async (path: string): Promise<unknown | null> => {
    try {
        const response = await fetch(`${LRCLIB_API_BASE}${path}`, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
};

const toSongResult = (track: LrclibTrack): SongResult | null => {
    if (typeof track.id !== 'number' || !track.trackName) return null;
    return {
        id: track.id,
        name: track.trackName,
        artists: [{ id: 0, name: track.artistName ?? '' }],
        album: { id: 0, name: track.albumName ?? '' },
        durationMs: Math.round((track.duration ?? 0) * 1000),
    };
};

export async function searchLrclibSongs(query: string, target: LyricMatchSearchTarget): Promise<SongResult[]> {
    const structured = new URLSearchParams();
    if (target.title) structured.set('track_name', target.title);
    if (target.artist) structured.set('artist_name', target.artist);

    let items = structured.toString()
        ? await fetchLrclibJson(`/search?${structured.toString()}`)
        : null;
    if (!Array.isArray(items) || items.length === 0) {
        items = await fetchLrclibJson(`/search?q=${encodeURIComponent(query)}`);
    }
    if (!Array.isArray(items)) return [];

    const results: SongResult[] = [];
    for (const item of items as LrclibTrack[]) {
        const result = toSongResult(item);
        if (result) results.push(result);
        if (results.length >= LRCLIB_MAX_RESULTS) break;
    }
    return results;
}

export async function fetchLrclibLyrics(song: SongResult): Promise<{ lyrics: LyricData | null; isPureMusic: boolean }> {
    const track = await fetchLrclibJson(`/get/${encodeURIComponent(String(song.id))}`) as LrclibTrack | null;
    if (!track) return { lyrics: null, isPureMusic: false };
    if (track.instrumental) return { lyrics: null, isPureMusic: true };
    const synced = typeof track.syncedLyrics === 'string' ? track.syncedLyrics.trim() : '';
    if (!synced) return { lyrics: null, isPureMusic: false };
    const lyrics = parseLyricsByFormat('lrc', synced);
    return { lyrics: hasRenderableLyrics(lyrics) ? lyrics : null, isPureMusic: false };
}
