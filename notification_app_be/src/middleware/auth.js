const config = require('../config');
const { fireLog } = require('../utils/fireLog');

/**
 * Requires Authorization: Bearer matching API_STUDENT_BEARER.
 * Attaches req.studentId from config.
 */
async function studentAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const parts = header.split(/\s+/);
    if (parts[0] !== 'Bearer' || !parts[1]) {
        fireLog('backend', 'warn', 'auth', 'Missing or invalid Authorization header');
        return res.status(401).json({ error: 'Missing or invalid bearer token' });
    }
    if (parts[1] !== config.apiStudentBearer) {
        fireLog('backend', 'warn', 'auth', 'Rejected bearer token');
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.studentId = config.studentId;
    return next();
}

module.exports = { studentAuth };
