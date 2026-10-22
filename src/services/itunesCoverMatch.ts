// src/services/itunesCoverMatch.ts
// Identifies a local song against Apple's public iTunes Search API (no key, no account) to
// borrow its canonical title / artist / album and its cover artwork. Used by the local-only
// build, whose songs cannot be matched through a music platform. Chinese repertoire is split
// across regional storefronts, so a few are asked in turn until one answers confidently.

const ITUNES_SEARCH_BASE = 'https://itunes.apple.com/search';
const ITUNES_STOREFRONTS = ['TW', 'HK', 'CN', 'US'] as const;
const ITUNES_RESULTS_PER_STOREFRONT = 5;

export interface ItunesCoverMatch {
trackId: number;
title: string;
artist: string;
album: string;
coverUrl: string;
}

interface ItunesTrack {
trackId?: number;
trackName?: string;
artistName?: string;
collectionName?: string;
artworkUrl100?: string;
}

const normalizeForMatch = (value: string): string => value
.toLowerCase()
.replace(/[\s·・\-—–_()（）\[\]]/g, '');

const isConfidentMatch = (track: ItunesTrack, title: string, artist: string): boolean => {
if (!track.trackName ||!track.artworkUrl100) return false;
if (normalizeForMatch(track.trackName)!== normalizeForMatch(title)) return false;
if (!artist ||!track.artistName) return true;
const wanted = normalizeForMatch(artist);
const offered = normalizeForMatch(track.artistName);
return offered.includes(wanted) || wanted.includes(offered);
};

const toCoverMatch = (track: ItunesTrack): ItunesCoverMatch | null => {
if (typeof track.trackId!== 'number' ||!track.trackName ||!track.artworkUrl100) return null;
return {
trackId: track.trackId,
title: track.trackName,
artist: track.artistName?? '',
album: track.collectionName?? '',
// The 100px artwork URL Apple returns upgrades to 600px by naming the size.
coverUrl: track.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg'),
};
};

export async function searchItunesCoverMatch(title: string, artist: string): Promise<ItunesCoverMatch | null> {
const term = [artist, title].filter(Boolean).join(' ');
if (!term) return null;
for (const country of ITUNES_STOREFRONTS) {
try {
const params = new URLSearchParams({
term,
media: 'music',
entity: 'song',
limit: String(ITUNES_RESULTS_PER_STOREFRONT),
country,
});
const response = await fetch(`${ITUNES_SEARCH_BASE}?${params.toString()}`, {
headers: { Accept: 'application/json'},
});
if (!response.ok) continue;
const data = await response.json() as { results?: ItunesTrack[]};
const hit = (data.results?? []).find(track => isConfidentMatch(track, title, artist));
if (hit) return toCoverMatch(hit);
} catch {
// A storefront that cannot be reached says nothing about the others.
continue;
}
}
return null;
}
