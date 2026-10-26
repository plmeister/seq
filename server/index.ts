import * as http from 'http'
import express from 'express'
import * as path from 'path'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import { getUserId } from './utils'
import { loadDoc, saveDoc, ensureDataDir } from './persistence'
import { setupWSConnection, docs } from './yws-setup'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

// Track docs and save intervals
const saveIntervals = new Map<string, NodeJS.Timeout>()

wss.on('connection', (conn, req) => {
  const userId = getUserId(req)
  console.log(`Client connected: ${userId}`)
  
  // Extract room name from URL path /ws/<room>, /seq/ws/<room>, or query param
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
  const rawRoom = url.pathname.replace(/^\/(?:seq\/)?ws\/?/, '').replace(/^\//, '') || url.searchParams.get('room') || 'default'
  const roomName = rawRoom.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default'
  
  if (setupWSConnection) {
    setupWSConnection(conn, req, { docName: roomName })
  }
  
  // Load and set up persistence for this doc
  const doc = docs.get(roomName)
  if (doc) {
    if (!saveIntervals.has(roomName)) {
      loadDoc(roomName, doc)
      const interval = setInterval(() => {
        saveDoc(roomName, doc)
      }, 30000)
      saveIntervals.set(roomName, interval)
    }
  }
})

// Serve static files from dist (support both stripped root and /seq prefix)
const distPath = path.join(process.cwd(), 'dist')
app.use('/seq', express.static(distPath))
app.use(express.static(distPath))

// SPA fallback
app.use((req, res, next) => {
  if (req.path && (req.path.startsWith('/ws') || req.path.startsWith('/seq/ws'))) return next()
  if (req.method !== 'GET') return next()
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next()
  })
})

ensureDataDir()

server.listen(PORT, HOST, () => {
  console.log(`seq server listening on ${HOST}:${PORT}`)
  console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/ws/<room>`)
})
