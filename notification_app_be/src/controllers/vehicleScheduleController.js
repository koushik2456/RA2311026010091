const { fireLog } = require('../utils/fireLog');
const { buildSchedule } = require('../services/vehicleScheduleService');

async function getSchedule(req, res, next) {
    try {
        const data = await buildSchedule();
        fireLog('backend', 'info', 'controller', 'Vehicle schedule built from evaluation service');
        return res.status(200).json({
            ok: true,
            ...data,
        });
    } catch (err) {
        if (err.response) {
            const status = err.response.status || 502;
            fireLog('backend', 'warn', 'service', `Evaluation upstream ${status}: ${err.message}`);
            return res.status(502).json({
                ok: false,
                error: 'Evaluation service returned an error',
                status,
                detail: err.response.data || err.message,
            });
        }
        if (err.code === 'CONFIG' || err.message.includes('Missing .env')) {
            return res.status(503).json({
                ok: false,
                error: 'Server is not configured for evaluation API (set ACCESS_TOKEN or full auth in .env)',
            });
        }
        return next(err);
    }
}

module.exports = { getSchedule };
