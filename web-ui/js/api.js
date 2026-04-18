/**
 * API Communication Module
 * 
 * Provides HTTP and WebSocket helpers for API Gateway communication.
 * Handles authentication tokens and request/response management.
 */

import { getEnv } from './env.js';

const API_BASE = (window.__API_BASE || getEnv('API_BASE')).replace(/\/+$/, '');

/**
 * Retrieve stored authentication token.
 * 
 * @returns {string|null} JWT token or null if not authenticated
 */
export const getToken = () => localStorage.getItem('authToken');

/**
 * Check if user is authenticated.
 * 
 * @returns {boolean} True if token exists
 */
export const isAuthenticated = () => !!getToken();

/**
 * Store authentication token.
 * 
 * @param {string} t - JWT token
 */
export const setToken = (t) => localStorage.setItem('authToken', t);

/**
 * Clear authentication token.
 */
export const clearToken = () => localStorage.removeItem('authToken');

/**
 * Build HTTP headers with authentication.
 * 
 * @param {Object} extra - Additional headers to merge
 * @returns {Object} Complete headers object
 */
export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
    ...extra,
  };
}

/**
 * Make authenticated API request.
 * 
 * @async
 * @param {string} path - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response
 * @throws {Error} If HTTP response is not OK
 */
export async function fetchApi(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Get WebSocket URL for real-time communication.
 * 
 * @returns {string} WebSocket URL with UI client type
 */
export function getWsUrl() {
  return API_BASE.replace(/^http/, 'ws') + '/?type=ui';
}