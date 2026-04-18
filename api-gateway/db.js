/**
 * Database Module
 * 
 * Handles SQLite database initialization and operations for attendance system.
 * Manages sessions, student records, images, and system configuration.
 * Uses sql.js for pure JavaScript SQLite - works on local PC and Railway.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'smart_muster.db');
let db = null;
let SQL = null;
let dbReady = false;

/**
 * Initialize database
 */
async function initDB() {
    try {
        if (dbReady) return;
        
        SQL = await initSqlJs();
        
        // Load existing database or create new one
        if (fs.existsSync(dbPath)) {
            const fileBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(fileBuffer);
            console.log('[Database] Loaded existing database from ' + dbPath);
        } else {
            db = new SQL.Database();
            console.log('[Database] Created new database');
        }
        
        // Create tables
        createTables();
        
        // Save to disk
        saveDB();
        
        dbReady = true;
        console.log('[Database] SQLite connection initialized successfully');
    } catch (error) {
        console.error('[Database] Initialization failed:', error);
        throw error;
    }
}

/**
 * Create database tables
 */
function createTables() {
    console.log('[Database] Checking and creating schema...');
    
    const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS attendance_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL DEFAULT 'manual',
            total INTEGER NOT NULL DEFAULT 0,
            present_count INTEGER NOT NULL DEFAULT 0,
            absent_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`,
        
        `CREATE TABLE IF NOT EXISTS session_present (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
            student_name TEXT NOT NULL
        )`,
        
        `CREATE TABLE IF NOT EXISTS session_absent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
            student_name TEXT NOT NULL
        )`,
        
        `CREATE TABLE IF NOT EXISTS session_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
            image_data TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0
        )`,
        
        `CREATE TABLE IF NOT EXISTS system_config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            image_capture_interval TEXT NOT NULL DEFAULT '["07:00"]',
            retry_delay INTEGER NOT NULL DEFAULT 3,
            face_recognition_threshold REAL NOT NULL DEFAULT 0.32,
            frame_count INTEGER NOT NULL DEFAULT 2,
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )`
    ];
    
    // Execute each CREATE TABLE statement
    sqlStatements.forEach(sql => {
        try {
            db.run(sql);
        } catch (error) {
            if (!error.message.includes('already exists')) {
                throw error;
            }
        }
    });

    // Ensure default config row exists
    try {
        const result = db.exec('SELECT id FROM system_config WHERE id = 1');
        if (!result || result.length === 0 || result[0].values.length === 0) {
            db.run('INSERT INTO system_config (id) VALUES (1)');
            console.log('[Database] Default configuration initialized.');
        }
    } catch (error) {
        console.log('[Database] Config check:', error.message);
    }
}

/**
 * Save database to disk
 */
function saveDB() {
    try {
        if (db) {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
        }
    } catch (error) {
        console.error('[Database] Save failed:', error);
    }
}

/**
 * Retrieve system configuration
 * @returns {Object} System configuration object
 */
function getConfig() {
    try {
        const result = db.exec('SELECT * FROM system_config WHERE id = 1');
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const row = {};
        
        columns.forEach((col, i) => {
            row[col] = values[i];
        });
        
        return {
            ...row,
            image_capture_interval: JSON.parse(row.image_capture_interval || '["07:00"]')
        };
    } catch (error) {
        console.error('[Database] getConfig error:', error);
        return null;
    }
}

/**
 * Update system configuration
 * @param {Object} configData - Configuration data to update
 */
function updateConfig(configData) {
    try {
        const interval = JSON.stringify(configData.image_capture_interval || ["07:00"]);
        const sql = `
            UPDATE system_config 
            SET image_capture_interval = ?,
                retry_delay = ?,
                face_recognition_threshold = ?,
                frame_count = ?,
                updated_at = datetime('now', 'localtime')
            WHERE id = 1
        `;
        
        db.run(sql, [
            interval,
            configData.retry_delay || 3,
            configData.face_recognition_threshold || 0.32,
            configData.frame_count || 2
        ]);
        
        saveDB();
    } catch (error) {
        console.error('[Database] updateConfig error:', error);
    }
}

/**
 * Create a new attendance session
 * @param {Object} sessionData - Session data
 * @returns {number} ID of newly created session
 */
function createSession(sessionData) {
    try {
        const sql = `
            INSERT INTO attendance_sessions (source, total, present_count, absent_count) 
            VALUES (?, ?, ?, ?)
        `;
        
        db.run(sql, [
            sessionData.source || 'manual',
            sessionData.total || 0,
            sessionData.present_count || 0,
            sessionData.absent_count || 0
        ]);
        
        // Get last insert ID
        const result = db.exec('SELECT last_insert_rowid() as id');
        const lastId = result[0].values[0][0];
        
        saveDB();
        return lastId;
    } catch (error) {
        console.error('[Database] createSession error:', error);
        return null;
    }
}

/**
 * Add student to present list
 * @param {number} sessionId - Session ID
 * @param {string} studentName - Student name
 */
function addSessionPresent(sessionId, studentName) {
    try {
        const sql = 'INSERT INTO session_present (session_id, student_name) VALUES (?, ?)';
        db.run(sql, [sessionId, studentName]);
        saveDB();
    } catch (error) {
        console.error('[Database] addSessionPresent error:', error);
    }
}

/**
 * Add student to absent list
 * @param {number} sessionId - Session ID
 * @param {string} studentName - Student name
 */
function addSessionAbsent(sessionId, studentName) {
    try {
        const sql = 'INSERT INTO session_absent (session_id, student_name) VALUES (?, ?)';
        db.run(sql, [sessionId, studentName]);
        saveDB();
    } catch (error) {
        console.error('[Database] addSessionAbsent error:', error);
    }
}

/**
 * Add captured image for a session
 * @param {number} sessionId - Session ID
 * @param {string} imageData - Base64-encoded image data
 * @param {number} isPrimary - 1 for primary, 0 for additional
 */
function addSessionImage(sessionId, imageData, isPrimary) {
    try {
        const sql = 'INSERT INTO session_images (session_id, image_data, is_primary) VALUES (?, ?, ?)';
        db.run(sql, [sessionId, imageData, isPrimary]);
        saveDB();
    } catch (error) {
        console.error('[Database] addSessionImage error:', error);
    }
}

/**
 * Retrieve the latest attendance session
 * @returns {Object|null} Latest session with details
 */
function getLatestSession() {
    try {
        const result = db.exec('SELECT * FROM attendance_sessions ORDER BY id DESC LIMIT 1');
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const session = {};
        
        columns.forEach((col, i) => {
            session[col] = values[i];
        });
        
        // Get present students
        const presentResult = db.exec('SELECT student_name FROM session_present WHERE session_id = ?', [session.id]);
        const presentNames = presentResult.length > 0 ? presentResult[0].values.map(v => v[0]) : [];
        
        // Get absent students
        const absentResult = db.exec('SELECT student_name FROM session_absent WHERE session_id = ?', [session.id]);
        const absentNames = absentResult.length > 0 ? absentResult[0].values.map(v => v[0]) : [];
        
        // Get primary image
        const imageResult = db.exec('SELECT image_data FROM session_images WHERE session_id = ? AND is_primary = 1 LIMIT 1', [session.id]);
        const image = imageResult.length > 0 && imageResult[0].values.length > 0 ? imageResult[0].values[0][0] : null;
        
        return {
            ...session,
            present_names: presentNames,
            absent_names: absentNames,
            image: image
        };
    } catch (error) {
        console.error('[Database] getLatestSession error:', error);
        return null;
    }
}

/**
 * Retrieve paginated attendance history
 * @param {number} limit - Number of records
 * @param {number} offset - Offset
 * @returns {Array} Sessions list
 */
function getSessionHistory(limit = 20, offset = 0) {
    try {
        const result = db.exec(
            'SELECT id, source, total, present_count, absent_count, created_at FROM attendance_sessions ORDER BY id DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        
        if (result.length === 0 || result[0].values.length === 0) {
            return [];
        }
        
        const columns = result[0].columns;
        const sessions = [];
        
        result[0].values.forEach(values => {
            const session = {};
            columns.forEach((col, i) => {
                session[col] = values[i];
            });
            sessions.push(session);
        });
        
        return sessions;
    } catch (error) {
        console.error('[Database] getSessionHistory error:', error);
        return [];
    }
}

/**
 * Retrieve complete details for a session
 * @param {number} id - Session ID
 * @returns {Object|null} Complete session details
 */
function getSessionDetails(id) {
    try {
        const result = db.exec('SELECT * FROM attendance_sessions WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const session = {};
        
        columns.forEach((col, i) => {
            session[col] = values[i];
        });
        
        // Get present students
        const presentResult = db.exec('SELECT student_name FROM session_present WHERE session_id = ?', [id]);
        const presentNames = presentResult.length > 0 ? presentResult[0].values.map(v => v[0]) : [];
        
        // Get absent students
        const absentResult = db.exec('SELECT student_name FROM session_absent WHERE session_id = ?', [id]);
        const absentNames = absentResult.length > 0 ? absentResult[0].values.map(v => v[0]) : [];
        
        // Get images
        const imagesResult = db.exec('SELECT image_data, is_primary FROM session_images WHERE session_id = ?', [id]);
        const images = imagesResult.length > 0 ? imagesResult[0].values.map(v => ({
            image_data: v[0],
            is_primary: v[1]
        })) : [];
        
        return {
            ...session,
            present_names: presentNames,
            absent_names: absentNames,
            images: images
        };
    } catch (error) {
        console.error('[Database] getSessionDetails error:', error);
        return null;
    }
}

module.exports = {
    initDB,
    saveDB,
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