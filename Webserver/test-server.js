// Test script for Minecraft Voice Chat Server
const WebSocket = require('ws');
const http = require('http');

console.log('🧪 Testing Minecraft Voice Chat Server...\n');

// Test 1: Health Check
async function testHealthCheck() {
    console.log('1. Testing Health Check Endpoint...');
    try {
        const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        
        if (response.ok && data.status === 'healthy') {
            console.log('   ✅ Health check passed');
            console.log(`   📊 Connected players: ${data.connectedPlayers}`);
        } else {
            console.log('   ❌ Health check failed');
            return false;
        }
    } catch (error) {
        console.log('   ❌ Health check error:', error.message);
        return false;
    }
    return true;
}

// Test 2: Player Join API
async function testPlayerJoinAPI() {
    console.log('\n2. Testing Player Join API...');
    try {
        const response = await fetch('http://localhost:3000/api/player/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: 'test-player-123',
                username: 'TestPlayer'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('   ✅ Player join API works');
            console.log(`   🔗 Voice chat URL: ${data.voiceChatUrl}`);
        } else {
            console.log('   ❌ Player join API failed');
            return false;
        }
    } catch (error) {
        console.log('   ❌ Player join API error:', error.message);
        return false;
    }
    return true;
}

// Test 3: WebSocket Connection
async function testWebSocketConnection() {
    console.log('\n3. Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3000');
        let testPassed = false;
        
        const timeout = setTimeout(() => {
            if (!testPassed) {
                console.log('   ❌ WebSocket connection timeout');
                ws.close();
                resolve(false);
            }
        }, 5000);
        
        ws.on('open', () => {
            console.log('   ✅ WebSocket connected');
            
            // Send join message
            ws.send(JSON.stringify({
                type: 'join',
                playerId: 'test-player-456',
                username: 'WebSocketTestPlayer',
                position: { x: 0, y: 0, z: 0 }
            }));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                
                if (message.type === 'joined') {
                    console.log('   ✅ Successfully joined voice chat');
                    console.log(`   🆔 Player ID: ${message.playerId}`);
                    testPassed = true;
                    clearTimeout(timeout);
                    ws.close();
                    resolve(true);
                }
            } catch (error) {
                console.log('   ❌ Invalid WebSocket message:', error.message);
            }
        });
        
        ws.on('error', (error) => {
            console.log('   ❌ WebSocket error:', error.message);
            clearTimeout(timeout);
            resolve(false);
        });
        
        ws.on('close', () => {
            if (!testPassed) {
                console.log('   ❌ WebSocket closed unexpectedly');
                clearTimeout(timeout);
                resolve(false);
            }
        });
    });
}

// Test 4: Position Update API
async function testPositionUpdate() {
    console.log('\n4. Testing Position Update API...');
    try {
        const response = await fetch('http://localhost:3000/api/player/position', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: 'test-player-123',
                position: { x: 100, y: 64, z: 200 },
                username: 'TestPlayer'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('   ✅ Position update API works');
            console.log(`   📍 Updated position: (${data.position.x}, ${data.position.y}, ${data.position.z})`);
        } else {
            console.log('   ❌ Position update API failed');
            return false;
        }
    } catch (error) {
        console.log('   ❌ Position update API error:', error.message);
        return false;
    }
    return true;
}

// Run all tests
async function runTests() {
    console.log('Starting tests for Minecraft Voice Chat Server...\n');
    
    const results = [];
    
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    results.push(await testHealthCheck());
    results.push(await testPlayerJoinAPI());
    results.push(await testWebSocketConnection());
    results.push(await testPositionUpdate());
    
    const passedTests = results.filter(Boolean).length;
    const totalTests = results.length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`📋 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Server is working correctly.');
        console.log('\n🚀 Ready for production deployment!');
        console.log('\nNext steps:');
        console.log('1. Set up Cloudflare Tunnel using tunnel.yml');
        console.log('2. Install the Minecraft plugin on your server');
        console.log('3. Update plugin config with your tunnel URL');
        console.log('4. Test with real players');
    } else {
        console.log('❌ Some tests failed. Check the server logs.');
        process.exit(1);
    }
}

// Make fetch available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('⚠️  This test requires Node.js 18+ for fetch API');
    console.log('   Alternative: Install node-fetch package');
    process.exit(1);
}

runTests().catch(console.error);
