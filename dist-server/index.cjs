"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var http = __toESM(require("http"), 1);
var import_express = __toESM(require("express"), 1);
var path2 = __toESM(require("path"), 1);
var import_ws2 = require("ws");
var Y3 = require("yjs");

// server/utils.ts
function getUserId(req) {
  const headers = req.headers;
  const remoteUser = headers["remote-user"] || headers["x-remote-user"];
  if (typeof remoteUser === "string" && remoteUser) {
    return remoteUser;
  }
  const remoteEmail = headers["remote-email"] || headers["x-remote-email"];
  if (typeof remoteEmail === "string" && remoteEmail) {
    return remoteEmail;
  }
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  return url.searchParams.get("user") || "anonymous";
}

// server/persistence.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var Y = __toESM(require("yjs"), 1);
var DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function getDocPath(docName) {
  const safe = docName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `${safe}.yjs`);
}
function saveDoc(docName, doc) {
  try {
    ensureDataDir();
    const update = Y.encodeStateAsUpdate(doc);
    fs.writeFileSync(getDocPath(docName), Buffer.from(update));
  } catch (e) {
    console.error("Failed to save doc:", e);
  }
}
function loadDoc(docName, doc) {
  try {
    const p = getDocPath(docName);
    if (!fs.existsSync(p)) return false;
    const buf = fs.readFileSync(p);
    Y.applyUpdate(doc, new Uint8Array(buf));
    return true;
  } catch (e) {
    console.error("Failed to load doc:", e);
    return false;
  }
}

// server/yws-setup.ts
var Y2 = __toESM(require("yjs"), 1);
var import_ws = require("ws");
var syncProtocol = __toESM(require("y-protocols/sync"), 1);
var awarenessProtocol = __toESM(require("y-protocols/awareness"), 1);
var encoding = __toESM(require("lib0/encoding"), 1);
var decoding = __toESM(require("lib0/decoding"), 1);
var map = __toESM(require("lib0/map"), 1);
var docs = /* @__PURE__ */ new Map();
var messageSync = 0;
var messageAwareness = 1;
var pingTimeout = 3e4;
var WSSharedDoc = class extends Y2.Doc {
  name;
  conns = /* @__PURE__ */ new Map();
  awareness;
  constructor(name) {
    super({ gc: true });
    this.name = name;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = this.conns.get(conn);
        if (connControlledIDs !== void 0) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };
    this.awareness.on("update", awarenessChangeHandler);
    this.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => {
        if (conn !== origin) {
          send(this, conn, message);
        }
      });
    });
  }
};
var getYDoc = (docname, gc = true) => map.setIfUndefined(docs, docname, () => {
  const doc = new WSSharedDoc(docname);
  docs.set(docname, doc);
  return doc;
});
var send = (doc, conn, m) => {
  if (conn.readyState !== import_ws.WebSocket.CONNECTING && conn.readyState !== import_ws.WebSocket.OPEN) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m);
  } catch (e) {
    closeConn(doc, conn);
  }
};
var closeConn = (doc, conn) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    }
    if (doc.conns.size === 0) {
    }
  }
  conn.close();
};
var setupWSConnection = (conn, req, { docName = "default", gc = true } = {}) => {
  conn.binaryType = "arraybuffer";
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, /* @__PURE__ */ new Set());
  conn.on("message", (message) => {
    try {
      const encoder2 = encoding.createEncoder();
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder2, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder2, doc, conn);
          if (encoding.length(encoder2) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder2));
          }
          break;
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
  let pingTimeoutId;
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
    clearTimeout(pingTimeoutId);
  });
  conn.on("pong", () => {
    pongReceived = true;
  });
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  send(doc, conn, encoding.toUint8Array(encoder));
  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoderAw = encoding.createEncoder();
    encoding.writeVarUint(encoderAw, messageAwareness);
    encoding.writeVarUint8Array(encoderAw, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())));
    send(doc, conn, encoding.toUint8Array(encoderAw));
  }
};

// server/index.ts
var app = (0, import_express.default)();
var server = http.createServer(app);
var wss = new import_ws2.WebSocketServer({ server });
var PORT = parseInt(process.env.PORT || "3000", 10);
var HOST = process.env.HOST || "0.0.0.0";
var saveIntervals = /* @__PURE__ */ new Map();
wss.on("connection", (conn, req) => {
  const userId = getUserId(req);
  console.log(`Client connected: ${userId}`);
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const rawRoom = url.pathname.replace(/^\/(?:seq\/)?ws\/?/, "").replace(/^\//, "") || url.searchParams.get("room") || "default";
  const roomName = rawRoom.replace(/[^a-zA-Z0-9_-]/g, "_") || "default";
  if (setupWSConnection) {
    setupWSConnection(conn, req, { docName: roomName });
  }
  const doc = docs.get(roomName);
  if (doc) {
    if (!saveIntervals.has(roomName)) {
      loadDoc(roomName, doc);
      const interval = setInterval(() => {
        saveDoc(roomName, doc);
      }, 3e4);
      saveIntervals.set(roomName, interval);
    }
  }
});
var distPath = path2.join(process.cwd(), "dist");
app.use("/seq", import_express.default.static(distPath));
app.use(import_express.default.static(distPath));
app.use((req, res, next) => {
  if (req.path && (req.path.startsWith("/ws") || req.path.startsWith("/seq/ws"))) return next();
  if (req.method !== "GET") return next();
  res.sendFile(path2.join(distPath, "index.html"), (err) => {
    if (err) next();
  });
});
ensureDataDir();
server.listen(PORT, HOST, () => {
  console.log(`seq server listening on ${HOST}:${PORT}`);
  console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/ws/<room>`);
});
