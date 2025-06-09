@echo off
echo Setting up Cloudflare Tunnel for Minecraft Voice Chat
echo.
echo Prerequisites:
echo 1. Install cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
echo 2. Login: cloudflared tunnel login
echo 3. Create tunnel: cloudflared tunnel create minecraft-voice-chat
echo 4. Update tunnel.yml with your domain
echo.
echo Starting tunnel...
cloudflared tunnel --config tunnel.yml run minecraft-voice-chat
pause
