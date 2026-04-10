// IndexedDB storage for image attachments.
// localStorage has a ~5 MB cap – a single screenshot can be 1–3 MB.
// IndexedDB is constrained only by available disk space (typically GBs).

export type AttachmentType = 'link' | 'image'

export type Attachment = {
  id: string
  type: AttachmentType
  // link fields
  url?: string
  label?: string
  // image fields
  imageKey?: string  // key in IndexedDB
  imageName?: string
}

const DB_NAME = 'dq_attachments_v1'
const STORE = 'images'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveImage(key: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(dataUrl, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadImage(key: string): Promise<string | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as string) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteImage(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Load all images for a project from IndexedDB, keyed by imageKey.
// Used by export functions that want to embed images.
export async function loadAllImages(
  answers: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const attachmentKeys = Object.keys(answers).filter((k) => k.endsWith('_attachments'))
  for (const key of attachmentKeys) {
    const attachments = parseAttachments(answers[key])
    for (const att of attachments) {
      if (att.type === 'image' && att.imageKey) {
        const dataUrl = await loadImage(att.imageKey)
        if (dataUrl) result[att.imageKey] = dataUrl
      }
    }
  }
  return result
}

export function parseAttachments(json: string | undefined): Attachment[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as Attachment[]) : []
  } catch {
    return []
  }
}
