/**
 * Command Routes
 * 
 * Handles real-time commands from Web UI to Python worker.
 * Supports manual trigger check-in and command acknowledgments.
 */

const express = require('express');
const { broadcastToWorker } = require('../ws');
const tryCatch = require('./tryCatch');

const router = express.Router();

/**
 * POST /api/command/trigger_checkin
 * 
 * Triggers an immediate check-in operation from Web UI dashboard.
 * Sends command to Python worker via WebSocket.
 * 
 * @async
 * @param {Object} res - Express response
 * @returns {Object} Success status and message
 */
router.post('/trigger_checkin', tryCatch(async (req, res) => {
    const payload = { requestedBy: 'admin_dashboard', source: 'manual' };
    
    console.log('[Command] Trigger check-in command sent to worker');
    broadcastToWorker('trigger_checkin', payload);
    
    return res.json({ success: true, message: "Check-in command sent to camera worker." });
}));

/**
 * POST /api/command/ack
 * 
 * Receives acknowledgment from Python worker after processing a command.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.id - Command ID
 * @param {string} req.body.status - Processing status
 * @param {Object} req.body.detail - Additional details
 * @param {Object} res - Express response
 * @returns {Object} Success status
 */
router.post('/ack', tryCatch(async (req, res) => {
    const { id, status, detail } = req.body || {};
    
    if (id) {
        console.log(`[Command ACK] ${id} -> ${status}`, detail || {});
    }
    return res.json({ success: true });
}));

module.exports = router;