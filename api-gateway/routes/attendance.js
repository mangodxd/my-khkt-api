/**
 * Attendance Routes
 * 
 * Handles attendance session management including:
 * - Retrieving latest attendance data
 * - Recording check-in results from Python worker
 * - Managing attendance images
 * - Providing attendance history
 */

const express = require('express');
const db = require('../db');
const { broadcastToUI } = require('../ws');
const tryCatch = require('./tryCatch');

const router = express.Router();

// In-memory cache for latest attendance session
let currentAttendanceCache = {};

/**
 * GET /api/attendance
 * 
 * Returns the latest attendance session for Web UI.
 * 
 * @async
 * @param {Object} res - Express response
 * @returns {Object} Latest attendance session or empty object
 */
router.get('/', tryCatch(async (req, res) => {
    const session = db.getLatestSession();
    return res.json({ 
        success: true, 
        data: session || {},
        message: session ? "Latest attendance session retrieved." : "No attendance session available."
    });
}));

/**
 * POST /api/attendance
 * 
 * Records check-in results from Python worker.
 * Saves attendance data and broadcasts to Web UI.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.source - Source of check-in ('auto' or 'manual')
 * @param {number} req.body.total - Total students
 * @param {Array} req.body.present_names - Names of present students
 * @param {Array} req.body.absent_names - Names of absent students
 * @param {Array} req.body.images - Array of base64 images
 * @param {Object} res - Express response
 * @returns {Object} Success status and session ID
 */
router.post('/', tryCatch(async (req, res) => {
    const { source = 'auto', total = 0, present_names = [], absent_names = [], images = [] } = req.body;

    const presentCount = present_names.length;
    const absentCount = absent_names.length;

    // Create new session
    const sessionId = db.createSession({ source, total, present_count: presentCount, absent_count: absentCount });
    console.log(`[Attendance] New session created ID: ${sessionId}`);

    // Record attendance for each student
    present_names.forEach(name => db.addSessionPresent(sessionId, name));
    absent_names.forEach(name => db.addSessionAbsent(sessionId, name));

    // Save all images (first image as primary, rest as secondary)
    images.forEach((imgData, idx) => {
        if (imgData) {
            db.addSessionImage(sessionId, imgData, idx === 0 ? 1 : 0);
        }
    });
    console.log(`[Attendance] Saved ${images.length} images for session ${sessionId}`);

    // Prepare data for broadcast
    currentAttendanceCache = {
        id: sessionId,
        source,
        total,
        present_count: presentCount,
        absent_count: absentCount,
        present_names,
        absent_names,
        images: images || [],
        image: images.length > 0 ? images[0] : null,  // Keep for backward compatibility
        created_at: new Date().toISOString()
    };
    broadcastToUI('attendance_update', currentAttendanceCache);

    return res.json({ 
        success: true, 
        data: currentAttendanceCache,
        message: "Attendance session recorded successfully."
    }); 
}));

/**
 * POST /api/attendance/upload_image
 * 
 * Records additional images from Python worker.
 * Used for extra frames captured during check-in.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {number} req.body.attendance_id - Session ID
 * @param {string} req.body.image - Base64 image
 * @param {number} req.body.is_primary - Whether this is primary image (0 or 1)
 * @param {Object} res - Express response
 * @returns {Object} Success status
 * @throws {Error} If attendance_id or image missing
 */
router.post('/upload_image', tryCatch(async (req, res) => {
    const { attendance_id, image, is_primary = 0 } = req.body || {};
    if (!attendance_id || !image) {
        throw new Error("Missing attendance_id or image data.");
    }

    db.addSessionImage(attendance_id, image, is_primary);
    console.log(`[Attendance] Image saved for session ID: ${attendance_id}`);

    // If primary image, update UI
    if (is_primary === 1) {
        currentAttendanceCache.image = image;
        broadcastToUI('attendance_update', currentAttendanceCache);
    }

    return res.json({ 
        success: true, 
        data: { attendance_id, image_saved: true },
        message: "Image saved successfully."
    });
}));

/**
 * GET /api/attendance/history
 * 
 * Returns paginated attendance history.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {number} req.query.limit - Number of records per page (default: 20)
 * @param {number} req.query.offset - Pagination offset (default: 0)
 * @param {Object} res - Express response
 * @returns {Object} Array of attendance sessions
 */
router.get('/history', tryCatch(async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const history = db.getSessionHistory(limit, offset);
    return res.json({ success: true, data: history });
}));

/**
 * GET /api/attendance/history/:id
 * 
 * Returns detailed information for a specific attendance session.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {number} req.params.id - Session ID
 * @param {Object} res - Express response
 * @returns {Object} Detailed session information
 */
router.get('/history/:id', tryCatch(async (req, res) => {
    const id = parseInt(req.params.id);
    const details = db.getSessionDetails(id);
    
    if (!details) {
        return res.status(404).json({ success: false, message: "Attendance session not found." });
    }
    return res.json({ success: true, data: details });
}));

module.exports = router;