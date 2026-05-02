const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function env(name, fallback) {
    const v = process.env[name];
    return v === undefined || v === '' ? fallback : v;
}

/** Ensure URL ends with .../evaluation-service (fixes 404 on /logs when .env is host-only). */
function normalizeEvaluationBaseUrl(input) {
    let u = String(input || 'http://20.207.122.201/evaluation-service').trim().replace(/\/+$/, '');
    if (!/\/evaluation-service$/i.test(u)) {
        u = `${u}/evaluation-service`;
    }
    return u;
}

/** Strip whitespace and optional wrapping quotes from pasted JSON tokens */
function normalizeAccessToken(raw) {
    if (raw == null) return undefined;
    let s = String(raw).trim();
    if (s.length >= 2) {
        const q = s[0];
        if ((q === '"' || q === "'") && s[s.length - 1] === q) {
            s = s.slice(1, -1).trim();
        }
    }
    return s || undefined;
}

module.exports = {
    port: parseInt(env('PORT', '3000'), 10),
    baseUrl: normalizeEvaluationBaseUrl(env('BASE_URL', 'http://20.207.122.201/evaluation-service')),
    /** If set, used for logging + API calls instead of POST /auth */
    accessToken: normalizeAccessToken(process.env.ACCESS_TOKEN),
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    email: process.env.EMAIL,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    apiStudentBearer: env('API_STUDENT_BEARER', 'dev-token-change-me'),
    studentId: parseInt(env('STUDENT_ID', '1'), 10),
};
