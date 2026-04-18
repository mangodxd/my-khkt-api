/**
 * Database Module
 * 
 * Handles SQLite database initialization and operations for attendance system.
 * Manages sessions, student records, images, and system configuration.
 */

const Database = require('better-sqlite3');
const path = require('path');

console.log('[Database] Initializing SQLite connection...');
const dbPath = path.resolve(__dirname, 'smart_muster.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');  // Improve write performance

/**
 * Initialize database schema and tables.
 * Creates all necessary tables if they don't exist.
 */
function initDB() {
    console.log('[Database] Checking and creating schema...');
    
    db.exec(`
        -- Stores each check-in session
        CREATE TABLE IF NOT EXISTS attendance_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL DEFAULT 'manual',
            total INTEGER NOT NULL DEFAULT 0,
            present_count INTEGER NOT NULL DEFAULT 0,
            absent_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        -- Each student detected as present
        CREATE TABLE IF NOT EXISTS session_present (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
            student_name TEXT NOT NULL
        );

        -- Each student detected as absent
        CREATE TABLE IF NOT EXISTS session_absent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
            student_name TEXT NOT NULL
        );

        -- Stores captured images per session
        CREATE TABLE IF NOT EXISTS session_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
            image_data TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0
        );

        -- System configuration
        CREATE TABLE IF NOT EXISTS system_config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            image_capture_interval TEXT NOT NULL DEFAULT '["07:00"]',
            retry_delay INTEGER NOT NULL DEFAULT 3,
            face_recognition_threshold REAL NOT NULL DEFAULT 0.32,
            frame_count INTEGER NOT NULL DEFAULT 2,
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
    `);

    // Ensure default config row exists with id = 1
    const configExists = db.prepare('SELECT id FROM system_config WHERE id = 1').get();
    if (!configExists) {
        db.prepare('INSERT INTO system_config (id) VALUES (1)').run();
        console.log('[Database] Default configuration initialized.');
    }
}

initDB();

/**
 * Retrieve system configuration.
 * 
 * @returns {Object} System configuration object with all settings
 */
function getConfig() {
    const row = db.prepare('SELECT * FROM system_config WHERE id = 1').get();
    return {
        ...row,
        image_capture_interval: JSON.parse(row.image_capture_interval)
    };
}

/**
 * Update system configuration.
 * 
 * @param {Object} configData - Configuration data to update
 */
function updateConfig(configData) {
    const stmt = db.prepare(`
        UPDATE system_config 
        SET image_capture_interval = @image_capture_interval,
            retry_delay = @retry_delay,
            face_recognition_threshold = @face_recognition_threshold,
            frame_count = @frame_count,
            updated_at = datetime('now', 'localtime')
        WHERE id = 1
    `);
    
    // Convert array to JSON string for storage
    const dataToSave = {
        ...configData,
        image_capture_interval: JSON.stringify(configData.image_capture_interval || ["07:00"])
    };
    stmt.run(dataToSave);
}

/**
 * Create a new attendance session.
 * 
 * @param {Object} sessionData - Session data with source, total, present_count, absent_count
 * @returns {number} ID of newly created session
 */
function createSession(sessionData) {
    const stmt = db.prepare(`
        INSERT INTO attendance_sessions (source, total, present_count, absent_count) 
        VALUES (@source, @total, @present_count, @absent_count)
    `);
    const info = stmt.run(sessionData);
    return info.lastInsertRowid;
}

/**
 * Add student to present list for a session.
 * 
 * @param {number} sessionId - Attendance session ID
 * @param {string} studentName - Name of student
 */
function addSessionPresent(sessionId, studentName) {
    const stmt = db.prepare('INSERT INTO session_present (session_id, student_name) VALUES (?, ?)');
    stmt.run(sessionId, studentName);
}

/**
 * Add student to absent list for a session.
 * 
 * @param {number} sessionId - Attendance session ID
 * @param {string} studentName - Name of student
 */
function addSessionAbsent(sessionId, studentName) {
    const stmt = db.prepare('INSERT INTO session_absent (session_id, student_name) VALUES (?, ?)');
    stmt.run(sessionId, studentName);
}

/**
 * Add captured image for a session.
 * 
 * @param {number} sessionId - Attendance session ID
 * @param {string} imageData - Base64-encoded image data
 * @param {number} isPrimary - 1 for primary image, 0 for additional
 */
function addSessionImage(sessionId, imageData, isPrimary) {
    const stmt = db.prepare('INSERT INTO session_images (session_id, image_data, is_primary) VALUES (?, ?, ?)');
    stmt.run(sessionId, imageData, isPrimary);
}

/**
 * Retrieve the latest attendance session.
 * Used for UI to load most recent attendance data.
 * 
 * @returns {Object|null} Latest session with student names and primary image, or null
 */
function getLatestSession() {
    const session = db.prepare('SELECT * FROM attendance_sessions ORDER BY id DESC LIMIT 1').get();
    if (!session) return null;

    const present = db.prepare('SELECT student_name FROM session_present WHERE session_id = ?').all(session.id);
    const absent = db.prepare('SELECT student_name FROM session_absent WHERE session_id = ?').all(session.id);
    const primaryImage = db.prepare('SELECT image_data FROM session_images WHERE session_id = ? AND is_primary = 1 LIMIT 1').get(session.id);

    return {
        ...session,
        present_names: present.map(p => p.student_name),
        absent_names: absent.map(a => a.student_name),
        image: primaryImage ? primaryImage.image_data : null
    };
}

/**
 * Retrieve paginated attendance history.
 * 
 * @param {number} limit - Number of records per page
 * @param {number} offset - Records to skip
 * @returns {Array} List of attendance sessions
 */
function getSessionHistory(limit = 20, offset = 0) {
    return db.prepare(`
        SELECT id, source, total, present_count, absent_count, created_at 
        FROM attendance_sessions 
        ORDER BY id DESC 
        LIMIT ? OFFSET ?
    `).all(limit, offset);
}

/**
 * Retrieve complete details for a specific session.
 * Includes all students and images.
 * 
 * @param {number} id - Session ID
 * @returns {Object|null} Complete session details or null if not found
 */
function getSessionDetails(id) {
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(id);
    if (!session) return null;

    const present = db.prepare('SELECT student_name FROM session_present WHERE session_id = ?').all(id);
    const absent = db.prepare('SELECT student_name FROM session_absent WHERE session_id = ?').all(id);
    const images = db.prepare('SELECT image_data, is_primary FROM session_images WHERE session_id = ?').all(id);

    return {
        ...session,
        present_names: present.map(p => p.student_name),
        absent_names: absent.map(a => a.student_name),
        images: images
    };
}

module.exports = {
    getConfig,
    updateConfig,
    createSession,
    addSessionPresent,
    addSessionAbsent,
    addSessionImage,
    getLatestSession,
    getSessionHistory,
    getSessionDetails
};