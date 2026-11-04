import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { apiFetch } from "./api";

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

export class FileNotFoundError extends Error {
  constructor(fileId: string) {
    super(`File not found: ${fileId}`);
    this.name = "FileNotFoundError";
  }
}

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64
    .replace(/^data:[^,]+,/, "")
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("File download returned invalid base64 data");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function fetchAndCacheFile(
  fileId: string,
  mimeType = "application/octet-stream",
): Promise<Blob> {
  const cached = await getCachedFile(fileId);
  if (cached) return cached;

  const res = await apiFetch(`/api/files/${fileId}`, {
    credentials: "include",
  });

  if (res.status === 404) {
    throw new FileNotFoundError(fileId);
  }
  if (!res.ok) {
    throw new Error(`File download failed with status ${res.status}`);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error("File download returned an invalid response");
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("b64_json" in payload) ||
    typeof payload.b64_json !== "string"
  ) {
    throw new Error("File download response does not contain b64_json");
  }

  const bytes = decodeBase64(payload.b64_json);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: mimeType });
  await cacheFile(fileId, blob);
  return blob;
}

export async function cacheGeneratedFileIds(
  files: { id: string; mimeType?: string }[],
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fetchAndCacheFile(file.id, file.mimeType);
      } catch (error) {
        console.error(`Failed to cache generated file ${file.id}`, error);
      }
    }),
  );
}
