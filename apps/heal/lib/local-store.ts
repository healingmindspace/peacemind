/**
 * IndexedDB-backed local storage for anonymous users.
 * Stores data in the same shape as Supabase rows so migration is seamless.
 */

const DB_NAME = "peacemind-local";
const DB_VERSION = 1;

// Stores that mirror Supabase tables
const STORES = {
  moods: "moods",
  journals: "journals",
  goals: "goals",
  tasks: "tasks",
  assessments: "assessments",
  breathingSessions: "breathing_sessions",
  moodOptions: "mood_options",
  dailyCheckins: "daily_checkins",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("created_at", "created_at", { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- CRUD operations ---

export async function localInsert(
  store: StoreName,
  row: Record<string, unknown>
): Promise<string> {
  const db = await openDB();
  const id = row.id as string || crypto.randomUUID();
  const record = {
    ...row,
    id,
    created_at: row.created_at || new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function localQuery(
  store: StoreName,
  opts?: {
    filters?: Record<string, unknown>;
    limit?: number;
    since?: string;
  }
): Promise<Record<string, unknown>[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const objectStore = tx.objectStore(store);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      let results = request.result as Record<string, unknown>[];

      // Apply filters
      if (opts?.filters) {
        results = results.filter((row) =>
          Object.entries(opts.filters!).every(([key, value]) => row[key] === value)
        );
      }

      // Filter by since
      if (opts?.since) {
        const sinceDate = new Date(opts.since).getTime();
        results = results.filter(
          (row) => new Date(row.created_at as string).getTime() >= sinceDate
        );
      }

      // Sort by created_at descending (newest first)
      results.sort(
        (a, b) =>
          new Date(b.created_at as string).getTime() -
          new Date(a.created_at as string).getTime()
      );

      // Apply limit
      if (opts?.limit) {
        results = results.slice(0, opts.limit);
      }

      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function localUpdate(
  store: StoreName,
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const objectStore = tx.objectStore(store);
    const getRequest = objectStore.get(id);

    getRequest.onsuccess = () => {
      if (!getRequest.result) {
        reject(new Error(`Record ${id} not found in ${store}`));
        return;
      }
      const updated = { ...getRequest.result, ...updates };
      objectStore.put(updated);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function localDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Migration: export all local data for claim ---

export async function exportAllLocalData(): Promise<
  Record<string, Record<string, unknown>[]>
> {
  const db = await openDB();
  const allData: Record<string, Record<string, unknown>[]> = {};

  for (const storeName of Object.values(STORES)) {
    const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (rows.length > 0) {
      allData[storeName] = rows;
    }
  }

  return allData;
}

// --- Clear all local data after successful migration ---

export async function clearAllLocalData(): Promise<void> {
  const db = await openDB();

  for (const storeName of Object.values(STORES)) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// --- Device ID management ---

const DEVICE_ID_KEY = "peacemind-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}

// --- Check if there's local data worth claiming ---

export async function hasLocalData(): Promise<boolean> {
  try {
    const data = await exportAllLocalData();
    return Object.values(data).some((rows) => rows.length > 0);
  } catch {
    return false;
  }
}
