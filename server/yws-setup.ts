import * as Y from 'yjs'
import { WebSocketServer, WebSocket } from 'ws'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as map from 'lib0/map'

export const docs = new Map<string, WSSharedDoc>()

const messageSync = 0
const messageAwareness = 1

const pingTimeout = 30000

export class WSSharedDoc extends Y.Doc {
  name: string
  conns = new Map<WebSocket, Set<number>>()
  awareness: awarenessProtocol.Awareness
  constructor(name: string) {
    super({ gc: true })
    this.name = name
    this.awareness = new awarenessProtocol.Awareness(this)
    this.awareness.setLocalState(null)
    const awarenessChangeHandler = ({ added, updated, removed }: any, conn: WebSocket | null) => {
      const changedClients = added.concat(updated, removed)
      if (conn !== null) {
        const connControlledIDs = this.conns.get(conn)
        if (connControlledIDs !== undefined) {
          added.forEach((clientID: number) => { connControlledIDs.add(clientID) })
          removed.forEach((clientID: number) => { connControlledIDs.delete(clientID) })
        }
      }
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
      const buff = encoding.toUint8Array(encoder)
      this.conns.forEach((_, c) => {
        send(this, c, buff)
      })
    }
    this.awareness.on('update', awarenessChangeHandler)
    this.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, update)
      const message = encoding.toUint8Array(encoder)
      this.conns.forEach((_, conn) => {
        if (conn !== origin) {
          send(this, conn, message)
        }
      })
    })
  }
}

const getYDoc = (docname: string, gc = true): WSSharedDoc => map.setIfUndefined(docs, docname, () => {
  const doc = new WSSharedDoc(docname)
  docs.set(docname, doc)
  return doc
})

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (conn.readyState !== WebSocket.CONNECTING && conn.readyState !== WebSocket.OPEN) {
    closeConn(doc, conn)
  }
  try {
    conn.send(m)
  } catch (e) {
    closeConn(doc, conn)
  }
}

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn)
    doc.conns.delete(conn)
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null)
    }
    if (doc.conns.size === 0) {
      // doc can be garbage collected
    }
  }
  conn.close()
}

export const setupWSConnection = (conn: WebSocket, req: any, { docName = 'default', gc = true }: any = {}) => {
  conn.binaryType = 'arraybuffer'
  const doc = getYDoc(docName, gc)
  doc.conns.set(conn, new Set())
  conn.on('message', (message: ArrayBuffer) => {
    try {
      const encoder = encoding.createEncoder()
      const decoder = decoding.createDecoder(new Uint8Array(message))
      const messageType = decoding.readVarUint(decoder)
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync)
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn)
          if (encoding.length(encoder) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder))
          }
          break
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn)
          break
        }
      }
    } catch (err) {
      console.error(err)
    }
  })
  let pingTimeoutId: NodeJS.Timeout
  let pongReceived = true
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn)
      }
      clearInterval(pingInterval)
    } else if (doc.conns.has(conn)) {
      pongReceived = false
      try {
        conn.ping()
      } catch (e) {
        closeConn(doc, conn)
        clearInterval(pingInterval)
      }
    }
  }, pingTimeout)
  conn.on('close', () => {
    closeConn(doc, conn)
    clearInterval(pingInterval)
    clearTimeout(pingTimeoutId)
  })
  conn.on('pong', () => {
    pongReceived = true
  })
  // Send sync step 1
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, messageSync)
  syncProtocol.writeSyncStep1(encoder, doc)
  send(doc, conn, encoding.toUint8Array(encoder))
  const awarenessStates = doc.awareness.getStates()
  if (awarenessStates.size > 0) {
    const encoderAw = encoding.createEncoder()
    encoding.writeVarUint(encoderAw, messageAwareness)
    encoding.writeVarUint8Array(encoderAw, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())))
    send(doc, conn, encoding.toUint8Array(encoderAw))
  }
}
