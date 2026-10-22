// src/services/musicBrainzCoverMatch.ts
// Second online cover source for the local-only build, asked when iTunes has no confident
// match: MusicBrainz finds the recording, the Cover Art Archive serves its front cover.
// Both answer browsers directly (CORS *), no key and no account. MusicBrainz asks callers
// to stay near one request per second; identification walks songs one at a time, so the
// natural pace already complies.

const MUSICBRAINZ_SEARCH_BASE = 'https://musicbrainz.org/ws/2/recording/';
const COVER_ART_BASE = 'https://coverartarchive.org/release';
const MUSICBRAINZ_RESULTS = 5;
const MUSICBRAINZ_MIN_SCORE = 80;

export interface MusicBrainzCoverMatch {
    trackId: string;
    title: string;
    artist: string;
    album: string;
    coverUrl: string;
}

interface MusicBrainzRecording {
    id?: string;
    title?: string;
    score?: number;
    'artist-credit'?: Array<{ name?: string; artist?: { name?: string } }>;
    releases?: Array<{ id?: string; title?: string }>;
}

const normalizeForMatch = (value: string): string => value
    .toLowerCase()
    .replace(/[\s·・\-—–_()（）\[\]]/g, '');

const escapeLucenePhrase = (value: string): string => value.replace(/(["\\])/g, '\\$1');

const artistOf = (recording: MusicBrainzRecording): string => (
    recording['artist-credit']?.map(credit => credit.name ?? credit.artist?.name ?? '').join(' ').trim() ?? ''
);

const isConfidentMatch = (recording: MusicBrainzRecording, title: string, artist: string): boolean => {
    if (!recording.title || (recording.score ?? 0) < MUSICBRAINZ_MIN_SCORE) return false;
    if (normalizeForMatch(recording.title) !== normalizeForMatch(title)) return false;
    if (!artist) return true;
    const wanted = normalizeForMatch(artist);
    const offered = normalizeForMatch(artistOf(recording));
    return offered.includes(wanted) || wanted.includes(offered);
};

export async function searchMusicBrainzCoverMatch(title: string, artist: string): Promise<MusicBrainzCoverMatch | null> {
    if (!title) return null;
    const query = artist
        ? `recording:"${escapeLucenePhrase(title)}" AND artistname:"${escapeLucenePhrase(artist)}"`
        : `recording:"${escapeLucenePhrase(title)}"`;
    let recordings: MusicBrainzRecording[] = [];
    try {
        const params = new URLSearchParams({ query, fmt: 'json', limit: String(MUSICBRAINZ_RESULTS) });
        const response = await fetch(`${MUSICBRAINZ_SEARCH_BASE}?${params.toString()}`, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) return null;
        const data = await response.json() as { recordings?: MusicBrainzRecording[] };
        recordings = data.recordings ?? [];
    } catch {
        return null;
    }

    for (const recording of recordings) {
        if (!isConfidentMatch(recording, title, artist)) continue;
        for (const release of recording.releases ?? []) {
            if (!release.id) continue;
            const coverUrl = `${COVER_ART_BASE}/${release.id}/front-500`;
            try {
                // The archive answers 404 for releases with no art; only a cover that
                // actually loads is worth writing onto the song.
                const coverResponse = await fetch(coverUrl);
                if (!coverResponse.ok) continue;
                await coverResponse.body?.cancel();
            } catch {
                continue;
            }
            return {
                trackId: recording.id ?? release.id,
                title: recording.title ?? title,
                artist: artistOf(recording),
                album: release.title ?? '',
                coverUrl,
            };
        }
    }
    return null;
}
