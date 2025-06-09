const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server,
    path: '/ws'  // Only handle WebSocket connections on /ws path
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients and their game data
const clients = new Map();
const playerPositions = new Map();

// Voice chat room management
class VoiceChatRoom {
    constructor() {
        this.clients = new Map();
    }

    addClient(playerId, ws, playerData) {
        this.clients.set(playerId, {
            ws,
            playerId,
            username: playerData.username,
            position: playerData.position || { x: 0, y: 0, z: 0 },
            isMuted: false,
            isDeafened: false
        });
        
        console.log(`Player ${playerData.username} (${playerId}) joined voice chat`);
        this.broadcastPlayerList();
    }

    removeClient(playerId) {
        const client = this.clients.get(playerId);
        if (client) {
            console.log(`Player ${client.username} (${playerId}) left voice chat`);
            this.clients.delete(playerId);
            this.broadcastPlayerList();
        }
    }

    updatePlayerPosition(playerId, position) {
        const client = this.clients.get(playerId);
        if (client) {
            client.position = position;
            playerPositions.set(playerId, position);
            this.broadcastPositionUpdate(playerId, position);
        }
    }

    calculateProximityVolume(pos1, pos2, maxDistance = 50) {
        const distance = Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) + 
            Math.pow(pos1.y - pos2.y, 2) + 
            Math.pow(pos1.z - pos2.z, 2)
        );
        
        if (distance >= maxDistance) return 0;
        
        // Linear falloff with smooth curve
        const normalizedDistance = distance / maxDistance;
        return Math.max(0, (1 - normalizedDistance) * 0.8 + 0.2);
    }

    broadcastVoiceData(senderId, audioData) {
        const sender = this.clients.get(senderId);
        if (!sender || sender.isMuted) return;

        this.clients.forEach((client, clientId) => {
            if (clientId === senderId || client.isDeafened) return;
            
            if (client.ws.readyState === WebSocket.OPEN) {
                // Calculate proximity-based volume
                const volume = this.calculateProximityVolume(
                    sender.position, 
                    client.position
                );
                
                if (volume > 0) {
                    client.ws.send(JSON.stringify({
                        type: 'voice_data',
                        senderId,
                        senderUsername: sender.username,
                        audioData,
                        volume,
                        timestamp: Date.now()
                    }));
                }
            }
        });
    }

    broadcastPlayerList() {
        const playerList = Array.from(this.clients.values()).map(client => ({
            playerId: client.playerId,
            username: client.username,
            position: client.position,
            isMuted: client.isMuted,
            isDeafened: client.isDeafened
        }));

        this.clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                    type: 'player_list',
                    players: playerList
                }));
            }
        });
    }

    broadcastPositionUpdate(playerId, position) {
        this.clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                    type: 'position_update',
                    playerId,
                    position
                }));
            }
        });
    }

    toggleMute(playerId) {
        const client = this.clients.get(playerId);
        if (client) {
            client.isMuted = !client.isMuted;
            this.broadcastPlayerList();
            return client.isMuted;
        }
        return false;
    }

    toggleDeafen(playerId) {
        const client = this.clients.get(playerId);
        if (client) {
            client.isDeafened = !client.isDeafened;
            this.broadcastPlayerList();
            return client.isDeafened;
        }
        return false;
    }
}

const voiceRoom = new VoiceChatRoom();

// Only allow WebSocket upgrades on /ws path
server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws') {
        socket.write('HTTP/1.1 400 Bad Request\r\n' +
                     'Connection: close\r\n' +
                     '\r\n' +
                     'Invalid Upgrade header');
        socket.destroy();
        return;
    }
    // Otherwise, let ws handle the upgrade
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    let playerId = null;
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'join':
                    playerId = data.playerId || uuidv4();
                    voiceRoom.addClient(playerId, ws, {
                        username: data.username || 'Unknown Player',
                        position: data.position || { x: 0, y: 0, z: 0 }
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'joined',
                        playerId,
                        message: 'Successfully joined voice chat'
                    }));
                    break;
                
                case 'voice_data':
                    if (playerId) {
                        voiceRoom.broadcastVoiceData(playerId, data.audioData);
                    }
                    break;
                
                case 'position_update':
                    if (playerId && data.position) {
                        voiceRoom.updatePlayerPosition(playerId, data.position);
                    }
                    break;
                
                case 'toggle_mute':
                    if (playerId) {
                        const isMuted = voiceRoom.toggleMute(playerId);
                        ws.send(JSON.stringify({
                            type: 'mute_status',
                            isMuted
                        }));
                    }
                    break;
                
                case 'toggle_deafen':
                    if (playerId) {
                        const isDeafened = voiceRoom.toggleDeafen(playerId);
                        ws.send(JSON.stringify({
                            type: 'deafen_status',
                            isDeafened
                        }));
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });
    
    ws.on('close', () => {
        if (playerId) {
            voiceRoom.removeClient(playerId);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// REST API for Minecraft plugin integration
app.post('/api/player/position', (req, res) => {
    const { playerId, position, username } = req.body;
    
    if (!playerId || !position) {
        return res.status(400).json({ error: 'Missing playerId or position' });
    }
    
    voiceRoom.updatePlayerPosition(playerId, position);
    
    res.json({ 
        success: true, 
        message: 'Position updated',
        playerId,
        position 
    });
});

app.post('/api/player/join', (req, res) => {
    const { playerId, username } = req.body;
    
    if (!playerId || !username) {
        return res.status(400).json({ error: 'Missing playerId or username' });
    }
    
    // Generate voice chat link
    const voiceChatUrl = `${req.protocol}://${req.get('host')}/voice?player=${playerId}&username=${encodeURIComponent(username)}`;
    
    res.json({
        success: true,
        voiceChatUrl,
        playerId,
        username
    });
});

// Serve the voice chat client
app.get('/voice', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'voice-client.html'));
});

// Serve the main index page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        connectedPlayers: voiceRoom.clients.size,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Minecraft Voice Chat Server running on port ${PORT}`);
    console.log(`Voice chat client: http://localhost:${PORT}/voice`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server shut down successfully');
        process.exit(0);
    });
});
