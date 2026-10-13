// Origin-scoped device storage. Document content never goes to a server.
let database;
function openDB() {
  if (!database) database = new Promise((resolve, reject) => {
    const req = indexedDB.open("pdfstudio", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { database = null; reject(req.error); };
  });
  return database;
}

async function transaction(mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const request = operation(tx.objectStore("files"));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error("Device storage unavailable"));
  });
}
export const putFile = (id, value) => transaction("readwrite", s => s.put(value, id));
export const getFile = id => transaction("readonly", s => s.get(id));
export const deleteFile = id => transaction("readwrite", s => s.delete(id));
export const clearFiles = () => transaction("readwrite", s => s.clear());
export const putState = (id, value) => putFile(`state:${id}`, value);
export async function getState(id) {
  const state = await getFile(`state:${id}`);
  return state && { ...state, sourceBlobs: state.sourceBlobs || await getFile(`sources:${id}`) || {} };
}
export async function deleteState(id) {
  await deleteFile(`state:${id}`);
  await deleteFile(`sources:${id}`);
}
export function getRecents() {
  try { return JSON.parse(localStorage.getItem("pdf_recents") || "[]"); }
  catch { return []; }
}
export function addRecent(meta) {
  const list = [meta, ...getRecents().filter(r => r.id !== meta.id)];
  localStorage.setItem("pdf_recents", JSON.stringify(list));
  return list;
}
export function removeRecent(id) {
  const list = getRecents().filter(r => r.id !== id);
  localStorage.setItem("pdf_recents", JSON.stringify(list));
  return list;
}