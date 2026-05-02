const { fireLog } = require('../utils/fireLog');
const notificationService = require('../services/notificationService');

async function list(req, res, next) {
    try {
        const type = req.query.type || null;
        const data = notificationService.listForStudent(req.studentId, type);
        fireLog('backend', 'info', 'controller', `Listed notifications for student ${req.studentId}`);
        return res.status(200).json(data);
    } catch (e) {
        return next(e);
    }
}

async function unreadCount(req, res, next) {
    try {
        const count = notificationService.unreadCount(req.studentId);
        fireLog('backend', 'info', 'controller', `Unread count ${count}`);
        return res.status(200).json({ unreadCount: count });
    } catch (e) {
        return next(e);
    }
}

async function markOneRead(req, res, next) {
    try {
        const { id } = req.params;
        const out = notificationService.markRead(req.studentId, id);
        fireLog('backend', 'info', 'controller', `Marked read ${id}`);
        return res.status(200).json(out);
    } catch (e) {
        return next(e);
    }
}

async function markAllRead(req, res, next) {
    try {
        const out = notificationService.markAllRead(req.studentId);
        fireLog('backend', 'info', 'controller', `Mark all read updated ${out.updatedCount}`);
        return res.status(200).json(out);
    } catch (e) {
        return next(e);
    }
}

module.exports = {
    list,
    unreadCount,
    markOneRead,
    markAllRead,
};
