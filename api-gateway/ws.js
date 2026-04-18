/**
 * WebSocket Server Management
 * 
 * Handles WebSocket connections for real-time communication between:
 * - Web UI: Receives attendance updates and config changes
 * - Python Worker: Sends check-in results and receives commands
 */

const WebSocket = require('ws');
const db = require('./db');

let wss;

/**
 * Initializes WebSocket server attached to HTTP server.
 * 
 * @param {Object} server - HTTP server instance
 */
function initWebSocket(server) {
    wss = new WebSocket.Server({ server });
    console.log('[WebSocket] Server initialized');

    wss.on('connection', (ws, req) => {
        // Extract client type from query parameter (?type=worker or ?type=ui)
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        ws.clientType = urlParams.get('type') || 'unknown';

        console.log(`[WebSocket] New client connected. Type: ${ws.clientType}`);

        // Send initial data based on client type
        const currentConfig = db.getConfig();
        if (ws.clientType === 'worker') {
            ws.send(JSON.stringify({ type: 'config_update', payload: currentConfig }));
        } else if (ws.clientType === 'ui') {
            ws.send(JSON.stringify({ type: 'config_update', payload: currentConfig }));
            const latestSession = db.getLatestSession();
            if (latestSession) {
                ws.send(JSON.stringify({ type: 'attendance_update', payload: latestSession }));
            }
        }

        ws.on('close', () => console.log(`[WebSocket] Client disconnected. Type: ${ws.clientType}`));
        ws.on('error', (err) => console.error('[WebSocket] Error:', err));
    });
}

/**
 * Broadcasts message to all UI clients.
 * 
 * @param {string} type - Event type name
 * @param {Object} payload - Event data
 */
function broadcastToUI(type, payload) {
    const message = JSON.stringify({ type, id: `evt_${Date.now()}`, payload });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.clientType === 'ui') {
            client.send(message);
        }
    });
}

/**
 * Broadcasts message to all worker clients (Python process).
 * 
 * @param {string} type - Event type name
 * @param {Object} payload - Event data
 */
function broadcastToWorker(type, payload) {
    const message = JSON.stringify({ type, id: `evt_${Date.now()}`, payload });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.clientType === 'worker') {
            client.send(message);
        }
    });
}

module.exports = {
    initWebSocket,
    broadcastToUI,
    broadcastToWorker
};