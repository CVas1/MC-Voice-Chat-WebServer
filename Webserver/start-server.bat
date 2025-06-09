@echo off
echo Starting Minecraft Voice Chat Server...
echo.
echo Server will be available at:
echo   Voice Chat: http://localhost:3000/voice
echo   Health Check: http://localhost:3000/api/health
echo   API Endpoint: http://localhost:3000/api/player/join
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
npm start
pause
