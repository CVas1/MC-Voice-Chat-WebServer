const express = require("express");
const { WebSocketServer } = require("ws");
const { v4: uuid } = require("uuid");
const path = require("path");
const url = require("url");
const fs = require("fs");

const API_SECRET =
  "NTueHos6cGG55QIFbYlOqANZcCOYWQlqscuWVonyhNodLZlTP6Tdk2TQA3YqAR3KpYjHY86eExDGip0HhD1ClQLYuQWB9dnTPcVm4kaUyW1JUSzrEInllrD2lcUUwhGm5n3PGlYbqaeP25nMwRUuDhvdgH9AWjs9uGIglGWDcw0Jve6jU9uek8Q56Xj9PjTctXfRbLwNXto6I17YwjrIhd0yU09bTVMJFizAMl4wmPEyTl1yH9uMeX2Er3tR4MkjH9sEYUeJIfYT9u9WfGPK4gJt301XtivuMfWeU25CpzzXSiN3Cabn5nRAaqImfDfMkw2gH4ZkGDwB9N9bPwzipAMFn5Vq2Bw90ReqGJxoDp1a07DtpMLHUrGOAshAW3bVvPtCRc5N9fH7QH7Yg2RTjnwW2ZYV8SHCsZ0UlpdDq6XEUwD08qb2XKJFrEERcG5tbFjX5Tg7G83M6tyuaCJzkvuHjtOWguJhUdHkm3E3AqWM7yQVCtVive1jKP1LIPpF";
const TOKENS_FILE_PATH = path.join(__dirname, "../plugins/VoiceChat/tokens.txt");

const app = express();
const httpPort = 3000;
const wsPort = 8080;

let validTokens = new Map(); // token => full line
let playerLocations = new Map(); // token => { x, y, z }

// Function to reload tokens from file and update playerLocations
function reloadTokens() {
  try {
    const data = fs.readFileSync(TOKENS_FILE_PATH, "utf8");
    const newTokens = new Map();
    const newLocations = new Map();
    data.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        const parts = trimmed.split(",");
        const token = parts[0];
        newTokens.set(token, trimmed); // Store full line for reference
        if (parts.length >= 5) {
          // Parse location if available
          const x = parseFloat(parts[2]);
          const y = parseFloat(parts[3]);
          const z = parseFloat(parts[4]);
          newLocations.set(token, { x, y, z });
        }
      }
    });
    validTokens = newTokens;
    playerLocations = newLocations;
  } catch (err) {
    console.error("Failed to reload tokens:", err.message);
    validTokens = new Map();
    playerLocations = new Map();
  }
}

// Initial load
reloadTokens();
// Reload every second
setInterval(reloadTokens, 1000);

app.use(express.json());

// ✅ Serve HTML only if token is valid
app.get("/", (req, res) => {
  const token = req.query.token;

  const validTokenList = Array.from(validTokens.keys()).join(", ");
  if (!validTokens.has(token)) {
    return res
      .status(403)
      .send(
        `<h1>Access Denied</h1><p>Invalid token. Valid tokens: ${validTokenList}</p>`
      );
  }

  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ✅ WebSocket auth
const wss = new WebSocketServer({ port: wsPort });
const clients = {};

wss.on("connection", (ws, req) => {
  const query = url.parse(req.url, true).query;
  const token = query.token;

  if (!validTokens.has(token)) {
    ws.close();
    console.log(`Blocked connection with invalid token: ${token}`);
    return;
  }

  const id = uuid();
  clients[id] = ws;
  console.log(`Client connected: ${id} (${validTokens.get(token)})`);

  ws.on("message", (message) => {
    for (const [clientId, client] of Object.entries(clients)) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message);
      }
    }
  });

  ws.on("close", () => {
    delete clients[id];
    console.log(`Client disconnected: ${id}`);
  });
});

app.listen(httpPort, () => {
  console.log(`Web server running at http://localhost:${httpPort}`);
});

// Error handler for debugging 500 errors
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res
    .status(500)
    .json({ error: "Internal server error", details: err.message });
});


