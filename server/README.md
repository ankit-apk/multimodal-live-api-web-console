# API Proxy Server for Multimodal Live API

This proxy server is designed to protect your Gemini API key by keeping it on the server side rather than exposing it in the frontend code.

## How it works

1. The frontend code connects to this proxy server via WebSocket instead of directly to the Gemini API.
2. The proxy server adds the API key to the request and forwards it to the Gemini API.
3. The proxy server then forwards the responses from the Gemini API back to the frontend client.

## Benefits

- The API key is never exposed in frontend network requests.
- The API key is stored securely on the server.
- No changes to the actual application functionality.

## Setup

The proxy server reads the API key from the `.env` file, so make sure your `REACT_APP_GEMINI_API_KEY` environment variable is set.

## Running

When you run `npm start`, the application will start both the React frontend and the proxy server concurrently. You can also run them separately:

- `npm run start-client`: Start only the React frontend
- `npm run start-server`: Start only the proxy server

## Configuration

By default, the proxy server runs on port 3001. You can change this by setting the `PORT` environment variable before starting the server.
