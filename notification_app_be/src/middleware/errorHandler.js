const { fireLog } = require('../utils/fireLog');

function errorHandler(err, req, res, next) {
    fireLog('backend', 'error', 'handler', err.message || String(err));
    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const body = { error: status === 500 ? 'Something went wrong. Try again in a moment.' : err.message };
    if (res.headersSent) {
        return next(err);
    }
    return res.status(status).json(body);
}

module.exports = { errorHandler };
