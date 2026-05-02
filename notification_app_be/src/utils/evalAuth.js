const axios = require('axios');
const config = require('../config');

/**
 * Obtain Bearer token for the evaluation logging API.
 */
async function getEvaluationToken() {
    const payload = {
        email: config.email,
        name: 't vinay koushik',
        rollNo: config.rollNo,
        accessCode: config.accessCode,
        clientID: config.clientId,
        clientSecret: config.clientSecret,
    };
    const missing = ['email', 'rollNo', 'accessCode', 'clientID', 'clientSecret'].filter(
        (k) => !payload[k] && k !== 'name'
    );
    if (missing.length) {
        const err = new Error(`Missing .env for auth: ${missing.join(', ')}`);
        err.code = 'CONFIG';
        throw err;
    }
    const resp = await axios.post(`${config.baseUrl}/auth`, payload, { timeout: 15000 });
    const token = resp.data && resp.data.access_token;
    if (!token) {
        throw new Error('Auth response had no access_token');
    }
    return token;
}

module.exports = { getEvaluationToken };
