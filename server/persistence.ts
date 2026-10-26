import * as fs from 'fs'
import * as path from 'path'
import * as Y from 'yjs'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getDocPath(docName: string): string {
  // sanitize
  const safe = docName.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(DATA_DIR, `${safe}.yjs`)
}

export function saveDoc(docName: string, doc: Y.Doc) {
  try {
    ensureDataDir()
    const update = Y.encodeStateAsUpdate(doc)
    fs.writeFileSync(getDocPath(docName), Buffer.from(update))
  } catch (e) {
    console.error('Failed to save doc:', e)
  }
}

export function loadDoc(docName: string, doc: Y.Doc): boolean {
  try {
    const p = getDocPath(docName)
    if (!fs.existsSync(p)) return false
    const buf = fs.readFileSync(p)
    Y.applyUpdate(doc, new Uint8Array(buf))
    return true
  } catch (e) {
    console.error('Failed to load doc:', e)
    return false
  }
}
