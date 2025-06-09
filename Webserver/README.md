# Minecraft Voice Chat Web Server

A proximity-based voice chat system for Minecraft servers using WebSockets and Web Audio API.

## Features

- **WebSocket-based voice routing** - All audio traffic routes through a central server
- **Proximity-based volume** - Voice volume changes based on in-game player distance
- **Real-time position tracking** - Minecraft plugin sends player coordinates to the server
- **Cloudflare Tunnel support** - Hide your server IP using free Cloudflare tunnels
- **Web Audio API** - High-quality voice capture and playback in browsers
- **Modern web interface** - Beautiful, responsive voice chat client
- **Mute/Deafen controls** - Players can control their audio settings
- **Audio visualization** - Real-time voice activity display

## Quick Start

### 1. Install Dependencies

```bash
cd "c:\Users\Admin\Desktop\MC-Voice-Chat-WebServer\Webserver"
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will run on `http://localhost:3000`

### 3. Test the Voice Chat

Visit `http://localhost:3000/voice?player=test-player&username=TestUser` to test the voice chat interface.

## Cloudflare Tunnel Setup

### 1. Install Cloudflared

Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

### 2. Login and Create Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create minecraft-voice-chat
```

### 3. Configure the Tunnel

Edit `tunnel.yml` and replace `your-voice-chat-domain.com` with your actual domain.

### 4. Run the Tunnel

```bash
cloudflared tunnel --config tunnel.yml run minecraft-voice-chat
```

## Minecraft Plugin Integration

### 1. Compile the Plugin

The provided Java plugin (`MinecraftVoiceChatPlugin.java`) needs to be compiled into a JAR file:

1. Create a new Maven/Gradle project
2. Add the Bukkit/Spigot dependency
3. Copy the plugin code
4. Build the JAR file

### 2. Install the Plugin

1. Copy the compiled JAR to your server's `plugins/` directory
2. Copy `config.yml` to `plugins/MinecraftVoiceChat/config.yml`
3. Update the `voice-server-url` in the config to your Cloudflare tunnel URL
4. Restart your Minecraft server

### 3. Plugin Commands

- `/voicechat` - Get your voice chat link
- `/voicechat-reload` - Reload configuration (admin only)

## API Endpoints

### Player Management

- `POST /api/player/join` - Generate voice chat link for a player
- `POST /api/player/position` - Update player position for proximity calculation
- `GET /api/health` - Server health check

### WebSocket Events

#### Client to Server:
- `join` - Join voice chat room
- `voice_data` - Send audio data
- `position_update` - Update player position
- `toggle_mute` - Toggle microphone mute
- `toggle_deafen` - Toggle audio output

#### Server to Client:
- `joined` - Successfully joined room
- `voice_data` - Receive audio from other players
- `player_list` - List of connected players
- `position_update` - Player position changes
- `mute_status` - Mute state update
- `deafen_status` - Deafen state update

## Configuration

### Server Configuration

The server can be configured via environment variables:

- `PORT` - Server port (default: 3000)

### Plugin Configuration

Edit `config.yml` in the plugin directory:

```yaml
# Voice server URL (your Cloudflare tunnel)
voice-server-url: "https://your-voice-chat-domain.com"

settings:
  # Position update frequency (milliseconds)
  position-update-interval: 1000
  
  # Minimum move distance before update
  minimum-move-distance: 0.5
  
  # Maximum voice range (blocks)
  max-voice-distance: 50
```

## How It Works

### 1. Player Joins Minecraft Server
- Plugin detects player join
- Generates unique voice chat link via API
- Sends link to player in chat

### 2. Player Opens Voice Chat
- Browser requests microphone access
- Connects to WebSocket server
- Joins voice chat room with player ID

### 3. Voice Transmission
- Web Audio API captures microphone input
- Audio data sent via WebSocket to server
- Server calculates proximity-based volume
- Audio routed to nearby players only

### 4. Position Updates
- Plugin tracks player movement in Minecraft
- Sends position updates to voice server
- Server recalculates voice volumes in real-time

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Requires HTTPS for microphone access
- **Mobile**: Limited support (iOS Safari has restrictions)

## Security Considerations

- Use HTTPS in production (required for microphone access)
- Cloudflare Tunnel provides DDoS protection
- No direct server IP exposure
- WebSocket connections are validated

## Troubleshooting

### Voice Not Working
1. Check microphone permissions in browser
2. Ensure HTTPS is used (required for mic access)
3. Verify WebSocket connection in browser console

### Plugin Not Connecting
1. Check voice server URL in plugin config
2. Verify server is running and accessible
3. Check Minecraft server logs for errors

### Cloudflare Tunnel Issues
1. Verify tunnel is running: `cloudflared tunnel info minecraft-voice-chat`
2. Check tunnel logs for connection errors
3. Ensure DNS records are properly configured

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

### Project Structure

```
Webserver/
├── server.js                 # Main WebSocket server
├── public/
│   └── voice-client.html     # Voice chat web interface
├── MinecraftVoiceChatPlugin.java  # Bukkit plugin source
├── plugin.yml               # Plugin manifest
├── config.yml              # Plugin configuration
├── tunnel.yml              # Cloudflare tunnel config
└── package.json            # Node.js dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to modify and distribute.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server/plugin logs
3. Test with the health check endpoint: `/api/health`

---

**Note**: This system requires modern browsers with Web Audio API support and WebSocket capabilities. Mobile support may be limited due to browser restrictions on audio capture.
