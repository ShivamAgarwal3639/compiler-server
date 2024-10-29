const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

// Store connected clients by console ID
const consoles = new Map();

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const { query } = url.parse(request.url, true);
  const consoleId = query.id;

  if (!consoleId) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, consoleId);
  });
});

// Handle WebSocket connections
wss.on('connection', (ws, consoleId) => {
  // Initialize console group if it doesn't exist
  if (!consoles.has(consoleId)) {
    consoles.set(consoleId, new Set());
  }

  // Add client to console group
  consoles.get(consoleId).add(ws);

  console.log(`Client connected to console: ${consoleId}`);
  console.log(`Active clients in console ${consoleId}: ${consoles.get(consoleId).size}`);

  // Handle incoming messages
  ws.on('message', (message) => {
    // Broadcast to all clients in the same console
    const clients = consoles.get(consoleId);
    if (clients) {
      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    const clients = consoles.get(consoleId);
    if (clients) {
      clients.delete(ws);
      
      // Remove console group if empty
      if (clients.size === 0) {
        consoles.delete(consoleId);
        console.log(`Console ${consoleId} removed (no active clients)`);
      } else {
        console.log(`Client disconnected from console: ${consoleId}`);
        console.log(`Remaining clients in console ${consoleId}: ${clients.size}`);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});