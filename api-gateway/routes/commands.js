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
 * POST /api/command/add_student
 * 
 * Adds a new student by sending their name and photo to the Python worker.
 * The image should be a base64 encoded string.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.name - Student's name
 * @param {string} req.body.image - Base64 encoded image
 * @param {Object} res - Express response
 * @returns {Object} Success status and message
 */
router.post('/add_student', tryCatch(async (req, res) => {
    const { name, image } = req.body;

    if (!name || !image) {
        return res.status(400).json({ success: false, message: "Name and image are required." });
    }

    // The image from the client might have a data URL prefix (e.g., "data:image/jpeg;base64,").
    // We need to remove it before sending it to the worker.
    const base64Image = image.split(';base64,').pop();

    const payload = { name, image: base64Image };
    
    console.log(`[Command] Add student '${name}' command sent to worker`);
    broadcastToWorker('add_student', payload);
    
    return res.json({ success: true, message: "Add student command sent to camera worker." });
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