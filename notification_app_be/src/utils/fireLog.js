const { Log } = require('logging-middleware');

/**
 * Best-effort logging: never throws; ignores failures when token is unset.
 */
function fireLog(stack, level, pkg, message) {
    let promise;
    try {
        promise = Log(stack, level, pkg, message);
    } catch {
        return;
    }
    if (promise && typeof promise.then === 'function') {
        promise.catch(() => {});
    }
}

module.exports = { fireLog };
