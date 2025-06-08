const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;
const TOKENS_FILE = "C:\\Users\\Admin\\Desktop\\MCServer\\plugins\\VoiceChat\\tokens.txt";
const PROXIMITY_DISTANCE = 30;

// Store connected players
const connectedPlayers = new Map();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Function to read and parse tokens file
function readTokens() {
  try {
    const data = fs.readFileSync(TOKENS_FILE, 'utf8');
    const lines = data.trim().split('\n');
    const tokens = new Map();
    
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length === 5) {
        const [name, token, x, y, z] = parts;
        tokens.set(token, {
          name: name.trim(),
          token: token.trim(),
          x: parseFloat(x),
          y: parseFloat(y),
          z: parseFloat(z)
        });
      }
    });
    
    return tokens;
  } catch (error) {
    console.error('Error reading tokens file:', error);
    return new Map();
  }
}

// Function to calculate 3D distance between two points
function calculateDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Function to find players within proximity
function findNearbyPlayers(playerToken) {
  const tokens = readTokens();
  const currentPlayer = tokens.get(playerToken);
  
  if (!currentPlayer) return [];
  
  const nearbyPlayers = [];
  
  for (const [token, playerData] of connectedPlayers) {
    if (token !== playerToken) {
      const tokenData = tokens.get(token);
      if (tokenData) {
        const distance = calculateDistance(currentPlayer, tokenData);
        if (distance <= PROXIMITY_DISTANCE) {
          nearbyPlayers.push({
            token,
            name: tokenData.name,
            distance: Math.round(distance * 100) / 100
          });
        }
      }
    }
  }
  
  return nearbyPlayers;
}

// Routes
app.get('/', (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    return res.status(400).send('Token is required');
  }
  
  const tokens = readTokens();
  const playerData = tokens.get(token);
  
  if (!playerData) {
    return res.status(404).send('Invalid token');
  }
  
  // Serve the index.html directly
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
    socket.on('join', (data) => {
    const { token } = data;
    const tokens = readTokens();
    
    if (tokens.has(token)) {
      const playerData = tokens.get(token);
      socket.token = token;
      socket.playerName = playerData.name;
      connectedPlayers.set(token, {
        socketId: socket.id,
        name: playerData.name,
        socket: socket
      });
      
      console.log(`Player ${playerData.name} joined with token ${token}`);
      
      // Send player info and initial nearby players
      socket.emit('player-info', { token, name: playerData.name });
      const nearbyPlayers = findNearbyPlayers(token);
      socket.emit('nearby-players', nearbyPlayers);
      
      // Notify other players about this player
      socket.broadcast.emit('player-joined', { token, name: playerData.name });
    } else {
      socket.emit('error', 'Invalid token');
      socket.disconnect();
    }
  });
  
  socket.on('check-proximity', () => {
    if (socket.token) {
      const nearbyPlayers = findNearbyPlayers(socket.token);
      socket.emit('nearby-players', nearbyPlayers);
    }
  });
  
  // WebRTC signaling
  socket.on('offer', (data) => {
    const targetPlayer = connectedPlayers.get(data.target);
    if (targetPlayer) {
      targetPlayer.socket.emit('offer', {
        offer: data.offer,
        from: socket.token,
        fromName: socket.playerName
      });
    }
  });
  
  socket.on('answer', (data) => {
    const targetPlayer = connectedPlayers.get(data.target);
    if (targetPlayer) {
      targetPlayer.socket.emit('answer', {
        answer: data.answer,
        from: socket.token,
        fromName: socket.playerName
      });
    }
  });
  
  socket.on('ice-candidate', (data) => {
    const targetPlayer = connectedPlayers.get(data.target);
    if (targetPlayer) {
      targetPlayer.socket.emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.token,
        fromName: socket.playerName
      });
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.token) {
      connectedPlayers.delete(socket.token);
      console.log(`Player ${socket.playerName} disconnected`);
      socket.broadcast.emit('player-left', { token: socket.token, name: socket.playerName });
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});