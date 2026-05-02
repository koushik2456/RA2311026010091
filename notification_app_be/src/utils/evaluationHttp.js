const axios = require('axios');
const config = require('../config');
const { getEvaluationToken } = require('./evalAuth');

function base() {
    return (config.baseUrl || '').replace(/\/$/, '');
}

/**
 * GET a path on the evaluation service (e.g. /depots, /vehicles).
 */
async function evalGet(path) {
    const token = await getEvaluationToken();
    const p = path.startsWith('/') ? path : `/${path}`;
    const url = `${base()}${p}`;
    return axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
    });
}

module.exports = { evalGet };
