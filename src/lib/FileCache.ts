import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface ImageCacheDB extends DBSchema {
  images: {
    key: string; // fileId
    value: {
      fileId: string;
      blob: Blob;
      mimeType: string;
      cachedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ImageCacheDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ImageCacheDB>("zeyrix-image-cache", 1, {
      upgrade(db) {
        db.createObjectStore("images", { keyPath: "fileId" });
      },
    });
  }
  return dbPromise;
}

export async function cacheFile(fileId: string, blob: Blob) {
  const db = await getDB();
  await db.put("images", {
    fileId,
    blob,
    mimeType: blob.type,
    cachedAt: Date.now(),
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zeyrix-file-cached", { detail: fileId }));
  }
}

export const cacheImage = cacheFile;

export async function getCachedFile(fileId: string): Promise<Blob | null> {
  const db = await getDB();
  const entry = await db.get("images", fileId);
  return entry?.blob ?? null;
}

export const getCachedImage = getCachedFile;

export async function deleteCachedImage(fileId: string) {
  const db = await getDB();
  await db.delete("images", fileId);
}

// Опционально: очистка старых записей, чтобы не разрастаться бесконечно
export async function pruneOldImages(
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000,
) {
  const db = await getDB();
  const all = await db.getAll("images");
  const cutoff = Date.now() - maxAgeMs;
  for (const entry of all) {
    if (entry.cachedAt < cutoff) {
      await db.delete("images", entry.fileId);
    }
  }
}
