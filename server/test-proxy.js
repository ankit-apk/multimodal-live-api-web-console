/**
 * Test script for the Multimodal Live API Proxy
 * 
 * This script tests the functionality of the proxy server by:
 * 1. Establishing a WebSocket connection to the proxy
 * 2. Sending a simple setup message
 * 3. Validating the response
 */

const WebSocket = require('ws');

console.log('Testing Multimodal Live API Proxy...');

// Connect to the proxy server
const ws = new WebSocket('ws://localhost:3001/api/ws');

ws.on('open', () => {
  console.log('Connected to proxy server');
  
  // Send a simple setup message
  const setupMessage = {
    setup: {
      model: 'models/gemini-2.0-flash-exp'
    }
  };
  
  console.log('Sending setup message:', JSON.stringify(setupMessage));
  ws.send(JSON.stringify(setupMessage));
});

ws.on('message', (data) => {
  try {
    // Parse and display the response
    const response = JSON.parse(data.toString());
    console.log('Received response:', JSON.stringify(response, null, 2));
    
    // If we receive a setupComplete message, the proxy is working correctly
    if (response.setupComplete) {
      console.log('✅ Proxy test successful! SetupComplete message received.');
      ws.close();
    }
  } catch (error) {
    console.error('Error parsing response:', error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} ${reason || 'No reason provided'}`);
  process.exit(0);
}); 