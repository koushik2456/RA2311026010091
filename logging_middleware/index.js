/**
 * Logging Middleware
 * Reusable Log() function that posts structured logs to the evaluation server.
 * Stack, level, and package values must be lowercase exactly as specified.
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://20.207.122.201/evaluation-service';

// Valid enums — enforced at call time
const VALID_STACK   = ['backend', 'frontend'];
const VALID_LEVEL   = ['debug', 'info', 'warn', 'error', 'fatal'];
const VALID_PACKAGE_BACKEND  = ['cache','controller','cron_job','db','domain','handler','repository','route','service'];
const VALID_PACKAGE_SHARED   = ['auth','config','middleware','utils'];
const VALID_PACKAGE_FRONTEND = ['api','component','hook','page','state','style'];

let authToken = null;

/**
 * Set the Bearer token for all subsequent Log() calls.
 * Call this once at application startup after obtaining the token.
 */
function setAuthToken(token) {
    authToken = token;
}

/**
 * Log(stack, level, package, message)
 * Posts a log entry to the evaluation server.
 *
 * @param {string} stack   - 'backend' | 'frontend'
 * @param {string} level   - 'debug' | 'info' | 'warn' | 'error' | 'fatal'
 * @param {string} pkg     - see valid package lists above
 * @param {string} message - descriptive log message
 */
async function Log(stack, level, pkg, message) {
    // Validate inputs
    if (!VALID_STACK.includes(stack))  throw new Error(`Invalid stack: ${stack}`);
    if (!VALID_LEVEL.includes(level))  throw new Error(`Invalid level: ${level}`);

    const allValid = [...VALID_PACKAGE_BACKEND, ...VALID_PACKAGE_SHARED, ...VALID_PACKAGE_FRONTEND];
    if (!allValid.includes(pkg)) throw new Error(`Invalid package: ${pkg}`);

    if (!authToken) throw new Error('Auth token not set. Call setAuthToken() first.');

    try {
        const response = await axios.post(
            `${BASE_URL}/logs`,
            { stack, level, package: pkg, message },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        return response.data;
    } catch (err) {
        // Fail silently in production — logging must never crash the app
        console.error('[LogMiddleware] Failed to post log:', err.message);
    }
}

module.exports = { Log, setAuthToken };
