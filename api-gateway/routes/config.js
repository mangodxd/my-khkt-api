/**
 * Configuration Routes
 * 
 * Handles system configuration retrieval and updates.
 * Synchronizes configuration changes with Python worker via WebSocket.
 */

const express = require('express');
const db = require('../db');
const { broadcastToWorker } = require('../ws');
const tryCatch = require('./tryCatch');

const router = express.Router();

/**
 * Sanitizes and validates configuration parameters.
 * 
 * @param {Object} newConfig - Raw configuration object
 * @returns {Object} Validated configuration with only allowed keys
 */
const sanitizeConfig = (newConfig = {}) => {
    const defaultConfigKeys = ['image_capture_interval', 'retry_delay', 'face_recognition_threshold', 'frame_count'];
    const sanitized = {};
    defaultConfigKeys.forEach((key) => {
        if (newConfig[key] !== undefined) sanitized[key] = newConfig[key];
    });
    return sanitized;
};

/**
 * GET /api/config
 * 
 * Returns current system configuration.
 * 
 * @async
 * @param {Object} res - Express response
 * @returns {Object} Current configuration
 */
router.get('/', tryCatch(async (req, res) => {
    const config = db.getConfig();
    console.log('[Config] Fetching system configuration');
    return res.json(config);
}));

/**
 * POST /api/config
 * 
 * Updates system configuration and broadcasts to Python worker.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {Object} req.body - Configuration parameters to update
 * @param {Object} res - Express response
 * @returns {Object} Success status and message
 * @throws {Error} If no valid configuration parameters provided
 */
router.post('/', tryCatch(async (req, res) => {
    const sanitized = sanitizeConfig(req.body || {});
    if (!Object.keys(sanitized).length) throw new Error("No valid configuration parameters provided.");

    const currentConfig = db.getConfig();
    const updatedConfig = { ...currentConfig, ...sanitized };
    
    db.updateConfig(updatedConfig);
    console.log('[Config] System configuration updated');

    // Notify Python worker of configuration changes
    broadcastToWorker('update_config', updatedConfig);
    
    return res.json({ success: true, message: "Configuration saved and propagated to worker." });
}));

module.exports = router;