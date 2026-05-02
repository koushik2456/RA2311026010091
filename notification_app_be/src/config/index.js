const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function env(name, fallback) {
    const v = process.env[name];
    return v === undefined || v === '' ? fallback : v;
}

module.exports = {
    port: parseInt(env('PORT', '3000'), 10),
    baseUrl: env('BASE_URL', 'http://20.207.122.201/evaluation-service'),
    /** If set, used for logging + API calls instead of POST /auth */
    accessToken: (process.env.ACCESS_TOKEN || '').trim() || undefined,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    email: process.env.EMAIL,
    rollNo: process.env.ROLL_NO,
    accessCode: process.env.ACCESS_CODE,
    apiStudentBearer: env('API_STUDENT_BEARER', 'dev-token-change-me'),
    studentId: parseInt(env('STUDENT_ID', '1'), 10),
};
