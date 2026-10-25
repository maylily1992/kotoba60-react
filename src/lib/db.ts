const DB_NAME = "kotoba60-media";
const DB_VERSION = 1;
const RECORDING_STORE = "recordings";

export interface RecordingRecord {
  id: string;
  sessionId: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDING_STORE)) {
        const store = db.createObjectStore(RECORDING_STORE, { keyPath: "id" });
        store.createIndex("sessionId", "sessionId");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecording(record: RecordingRecord) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readwrite");
    tx.objectStore(RECORDING_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record.id;
}

export async function getRecording(id: string): Promise<RecordingRecord | undefined> {
  const db = await openDb();
  const record = await new Promise<RecordingRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readonly");
    const request = tx.objectStore(RECORDING_STORE).get(id);
    request.onsuccess = () => resolve(request.result as RecordingRecord | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return record;
}

export async function deleteRecording(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readwrite");
    tx.objectStore(RECORDING_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearRecordings() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(RECORDING_STORE, "readwrite");
    tx.objectStore(RECORDING_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function estimateStorage() {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 };
  return navigator.storage.estimate();
}
