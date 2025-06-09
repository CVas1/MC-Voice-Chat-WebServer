# Deployment Guide for Minecraft Voice Chat Server

## Production Deployment

### 1. Server Requirements
- Node.js 16+ 
- 2GB+ RAM recommended
- Stable internet connection
- Domain name (for Cloudflare Tunnel)

### 2. Environment Setup

1. Copy the environment template:
```bash
copy .env.example .env
```

2. Edit `.env` and configure your settings:
```env
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

### 3. Process Management (PM2)

Install PM2 for production process management:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'minecraft-voice-chat',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: 'logs/combined.log',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    restart_delay: 4000,
    max_restarts: 10
  }]
}
```

Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4. Cloudflare Tunnel Setup (Detailed)

#### Step 1: Install Cloudflared
- Windows: Download from Cloudflare releases
- Linux: `wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb`

#### Step 2: Authenticate
```bash
cloudflared tunnel login
```

#### Step 3: Create Tunnel
```bash
cloudflared tunnel create minecraft-voice-chat
```

#### Step 4: Configure DNS
In Cloudflare dashboard, add a CNAME record:
- Name: `voice-chat` (or your subdomain)
- Target: `<tunnel-id>.cfargotunnel.com`

#### Step 5: Update tunnel.yml
```yaml
tunnel: minecraft-voice-chat
credentials-file: C:\Users\Admin\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: voice-chat.your-domain.com
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tlsTimeout: 10s
      httpHostHeader: localhost:3000
  - service: http_status:404
```

#### Step 6: Start Tunnel
```bash
cloudflared tunnel --config tunnel.yml run minecraft-voice-chat
```

### 5. SSL Certificate (Alternative to Cloudflare)

If not using Cloudflare Tunnel, set up Let's Encrypt:

```bash
# Install Certbot
# Windows: Download from https://certbot.eff.org/
# Linux: sudo apt-get install certbot

# Get certificate
certbot certonly --standalone -d your-domain.com

# Update server.js to use HTTPS
# Add SSL configuration to server creation
```

### 6. Firewall Configuration

Open required ports:
- Port 3000 (or your configured port)
- Port 80 (for Let's Encrypt, if used)
- Port 443 (for HTTPS)

Windows Firewall:
```cmd
netsh advfirewall firewall add rule name="Voice Chat Server" dir=in action=allow protocol=TCP localport=3000
```

Linux iptables:
```bash
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

### 7. Monitoring and Logging

#### Log Files
- Server logs: `logs/`
- PM2 logs: `~/.pm2/logs/`
- Cloudflare tunnel logs: `~/.cloudflared/`

#### Health Monitoring
Set up automated health checks:
```bash
# Cron job to check server health
*/5 * * * * curl -f http://localhost:3000/api/health || systemctl restart minecraft-voice-chat
```

#### Resource Monitoring
Monitor server resources:
```bash
pm2 monit
```

### 8. Security Considerations

#### Rate Limiting
The server includes basic rate limiting. For production, consider:
- Cloudflare rate limiting rules
- nginx reverse proxy with rate limiting
- Additional DDoS protection

#### Access Control
- Restrict API endpoints to Minecraft server IPs
- Use authentication tokens for sensitive operations
- Monitor for suspicious activity

### 9. Backup and Recovery

#### Configuration Backup
Regularly backup:
- `tunnel.yml`
- `.env`
- `ecosystem.config.js`
- Cloudflare tunnel credentials

#### Database (if added later)
If you add a database:
```bash
# Example backup script
mongodump --host localhost --port 27017 --out backup/$(date +%Y%m%d)
```

### 10. Performance Optimization

#### Node.js Optimization
- Use clustering for multiple CPU cores
- Enable gzip compression
- Optimize garbage collection

#### Network Optimization
- Use CDN for static assets
- Enable HTTP/2 if possible
- Minimize WebSocket message size

### 11. Troubleshooting

#### Common Issues

**WebSocket Connection Failed:**
- Check firewall settings
- Verify SSL certificate
- Test with browser dev tools

**Audio Not Working:**
- Ensure HTTPS is used
- Check microphone permissions
- Verify Web Audio API support

**Plugin Connection Issues:**
- Check Minecraft server logs
- Verify API endpoint accessibility
- Test with curl/Postman

**High Resource Usage:**
- Monitor with `pm2 monit`
- Check for memory leaks
- Optimize audio processing

### 12. Scaling

For high traffic:
- Use load balancer (nginx, HAProxy)
- Implement Redis for session storage
- Consider multiple server instances
- Use dedicated audio processing servers

### 13. Updates and Maintenance

#### Update Process
1. Stop services: `pm2 stop minecraft-voice-chat`
2. Backup current version
3. Update code: `git pull origin main`
4. Install dependencies: `npm install`
5. Restart services: `pm2 restart minecraft-voice-chat`

#### Regular Maintenance
- Update dependencies monthly
- Review logs weekly
- Monitor performance metrics
- Test voice quality regularly
