/**
 * Smart Muster Camera - API Gateway Server
 * 
 * Main Express server initialization with middleware configuration,
 * route mounting, and WebSocket integration.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initWebSocket } = require('./ws');

// Import route handlers
const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');
const attendanceRoutes = require('./routes/attendance');
const commandRoutes = require('./routes/commands');

const PORT = process.env.PORT || 3000;

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize WebSocket
initWebSocket(server);

// Mount API routes
app.use('/api', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/command', commandRoutes);

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
    res.send(`<h1>Smart Muster Camera API is Running!</h1>`);
});

// Start server
server.listen(PORT, () => {
    console.log(`[Server] API Gateway running on port ${PORT}`);
});