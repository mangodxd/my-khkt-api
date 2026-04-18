/**
 * Authentication Routes
 * 
 * Handles admin login with JWT token generation.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const tryCatch = require('./tryCatch');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * POST /api/login
 * 
 * Authenticates admin credentials and returns JWT token.
 * 
 * @async
 * @param {Object} req - Express request
 * @param {string} req.body.email - Admin email
 * @param {string} req.body.password - Admin password
 * @param {Object} res - Express response
 * @returns {Object} success status, JWT token, and message
 * @throws {Error} If credentials are invalid
 */
router.post('/login', tryCatch(async (req, res) => {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '8h' });
        console.log('[Auth] Login successful:', email);
        return res.json({ success: true, token, message: "Login successful." });
    }
    
    console.log('[Auth] Login failed:', email);
    throw new Error("Invalid email or password.");
}));

module.exports = router;