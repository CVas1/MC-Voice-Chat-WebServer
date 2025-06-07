const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuid } = require('uuid');
const path = require('path');
const url = require('url');

const API_SECRET = "NTueHos6cGG55QIFbYlOqANZcCOYWQlqscuWVonyhNodLZlTP6Tdk2TQA3YqAR3KpYjHY86eExDGip0HhD1ClQLYuQWB9dnTPcVm4kaUyW1JUSzrEInllrD2lcUUwhGm5n3PGlYbqaeP25nMwRUuDhvdgH9AWjs9uGIglGWDcw0Jve6jU9uek8Q56Xj9PjTctXfRbLwNXto6I17YwjrIhd0yU09bTVMJFizAMl4wmPEyTl1yH9uMeX2Er3tR4MkjH9sEYUeJIfYT9u9WfGPK4gJt301XtivuMfWeU25CpzzXSiN3Cabn5nRAaqImfDfMkw2gH4ZkGDwB9N9bPwzipAMFn5Vq2Bw90ReqGJxoDp1a07DtpMLHUrGOAshAW3bVvPtCRc5N9fH7QH7Yg2RTjnwW2ZYV8SHCsZ0UlpdDq6XEUwD08qb2XKJFrEERcG5tbFjX5Tg7G83M6tyuaCJzkvuHjtOWguJhUdHkm3E3AqWM7yQVCtVive1jKP1LIPpF";

const app = express();
const httpPort = 3000;
const wsPort = 8080;

let validTokens = new Map(); // token => playerName or UUID
let validTokensFilePath = null;

app.use(express.json());

// ✅ Register token from Minecraft plugin
app.post('/registerToken', (req, res) => {
  const apiKey = req.headers['api-key'];
  
  if (apiKey !== API_SECRET) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  const { token, playerName } = req.body;

  if (!token || !playerName) {
    return res.status(400).json({ error: 'Missing token or playerName' });
  }
  validTokens.set(token, playerName);
  res.json({ success: true });
});

// ✅ Serve HTML only if token is valid
app.get('/', (req, res) => {
  const token = req.query.token;
//print all tokens
    const validTokenList = Array.from(validTokens.keys()).join(', ');
  if (!validTokens.has(token)) {
    return res.status(403).send(`<h1>Access Denied</h1><p>Invalid token. Valid tokens: ${validTokenList}</p>`);
  }

  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ✅ WebSocket auth
const wss = new WebSocketServer({ port: wsPort });
const clients = {};

wss.on('connection', (ws, req) => {
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

  ws.on('message', (message) => {
    for (const [clientId, client] of Object.entries(clients)) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message);
      }
    }
  });

  ws.on('close', () => {
    delete clients[id];
    console.log(`Client disconnected: ${id}`);
  });
});

app.listen(httpPort, () => {
  console.log(`Web server running at http://localhost:${httpPort}`);
});

// Error handler for debugging 500 errors
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// GET endpoint to set the valid tokens file path
app.get('/setTokensFile', (req, res) => {
  const apiKey = req.headers['api-key'];
  if (apiKey !== API_SECRET) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  const { path: filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ error: 'Missing file path' });
  }
  validTokensFilePath = filePath;
  res.json({ success: true, filePath });
});
