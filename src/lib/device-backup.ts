export interface DeviceBackup { date: string; data: string }
const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('rupee-ledger-recovery', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('Device backup storage is busy.'));
});
async function readDatabase(key: string): Promise<DeviceBackup[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readonly');
    const request = tx.objectStore('snapshots').get(key);
    tx.oncomplete = () => resolve(request.result || []);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
function legacySlots(key: string): DeviceBackup[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(s => typeof s?.date === 'string' && typeof s?.data === 'string') : [];
  } catch { return []; }
}
export async function readDeviceBackups(key: string): Promise<DeviceBackup[]> {
  try { const slots = await readDatabase(key); if (slots.length) return slots; } catch { /* Use existing browser copies. */ }
  return legacySlots(key);
}
async function writeDeviceBackup(key: string, date: string, data: string, keep = 3): Promise<number> {
  const previous = await readDeviceBackups(key);
  const slots = [{ date, data }, ...previous.filter(s => s.date !== date)].slice(0, keep);
  try {
    const db = await database();
    try { await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(slots, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }); } finally { db.close(); }
    return slots.length;
  } catch { /* Private browsers may disable IndexedDB; try an atomic localStorage replacement. */ }
  for (let count = slots.length; count > 0; count--) {
    try { localStorage.setItem(key, JSON.stringify(slots.slice(0, count))); return count; } catch { /* Failed writes retain the previous value. */ }
  }
  throw new Error('This browser cannot store a device recovery copy. Download a backup file; cloud backup can still run.');
}
/** Status hints must never turn a verified cloud save into a failure. */
export function backupStatus(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Cloud history is authoritative. */ }
}

const pending = new Map<string, Promise<unknown>>();
export function saveDeviceBackup(key: string, date: string, data: string, keep = 3): Promise<number> {
  const next = (pending.get(key) || Promise.resolve()).catch(() => {}).then(() => writeDeviceBackup(key, date, data, keep));
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => {});
  return next;
}
