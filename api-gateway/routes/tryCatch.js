/**
 * Async Error Handler Wrapper
 * 
 * Wraps async route handlers to catch errors and prevent server crashes.
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const tryCatch = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (e) {
        console.error('[API Error]', e);
        res.status(500).json({ success: false, message: e.message || "System error occurred." });
    }
};

module.exports = tryCatch;