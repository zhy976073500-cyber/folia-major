import { appDatabase } from './appDatabase';

// src/services/localSongBlobStore.ts
// Audio bytes for songs imported through the file-picker fallback (no File System Access):
// the picked file is copied into the app database under the song id and served back from
// there, so these songs keep playing after the original file is moved or deleted.

export const putLocalSongBlob = async (songId: string, blob: Blob): Promise<void> => {
  await appDatabase.local_music_blobs.put({ id: songId, blob });
};

export const getLocalSongBlob = async (songId: string): Promise<Blob | undefined> => (
  (await appDatabase.local_music_blobs.get(songId))?.blob
);

export const deleteLocalSongBlobs = async (songIds: string[]): Promise<void> => {
  if (songIds.length > 0) {
    await appDatabase.local_music_blobs.bulkDelete(songIds);
  }
};

/** Drops copied audio whose song record no longer exists (deleted through any path). */
export const sweepOrphanedLocalSongBlobs = async (liveSongIds: ReadonlySet<string>): Promise<void> => {
  const blobIds = await appDatabase.local_music_blobs.toCollection().keys();
  const orphaned = blobIds.filter(id => !liveSongIds.has(String(id))) as string[];
  if (orphaned.length > 0) {
    await appDatabase.local_music_blobs.bulkDelete(orphaned);
  }
};
