/**
 * Proxy server for Multimodal Live API
 * 
 * This server acts as a secure intermediary between the client and the Gemini API.
 * It proxies WebSocket connections, adding the API key on the server side
 * to prevent exposure in frontend network requests.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// Get API key from environment variable
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: REACT_APP_GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/api/ws' });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  let geminiWs = null;
  let setupReceived = false;

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      // Parse the message to see if it's a setup message
      const data = JSON.parse(message.toString());
      
      // If this is a setup message and we haven't set up the connection yet
      if (data.setup && !setupReceived) {
        setupReceived = true;
        console.log('Setup message received, establishing connection to Gemini');
        
        // Create a connection to the Gemini API
        const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
        geminiWs = new WebSocket(geminiUrl);
        
        // Handle messages from Gemini and forward to client
        geminiWs.on('message', (geminiMessage) => {
          ws.send(geminiMessage);
        });
        
        // Handle WebSocket errors
        geminiWs.on('error', (error) => {
          console.error('Gemini WebSocket error:', error);
          ws.close(1011, 'Error connecting to Gemini API');
        });
        
        // Handle WebSocket close
        geminiWs.on('close', (code, reason) => {
          console.log(`Gemini WebSocket closed: ${code} ${reason}`);
          ws.close(code, reason);
        });
        
        // Once the connection is established, send the setup message
        geminiWs.on('open', () => {
          console.log('Connection to Gemini established, sending setup message');
          geminiWs.send(message);
        });
      } else {
        // For non-setup messages or subsequent messages, forward them if the connection is ready
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(message);
        } else if (!setupReceived) {
          console.error('Error: First message must be a setup message');
          ws.close(1003, 'Protocol error: First message must be a setup message');
        } else {
          console.log('Waiting for Gemini connection to be ready...');
          // Could implement a message queue here if needed
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.close(1007, 'Invalid message format');
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    if (geminiWs) {
      geminiWs.close();
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 