const { v4: uuidv4 } = require('uuid');

const VALID_TYPES = new Set(['Placement', 'Event', 'Result']);

/** @type {Map<number, Array<{id:string,type:string,message:string,isRead:boolean,createdAt:string}>>} */
const store = new Map();

function ensureStudent(studentId) {
    if (!store.has(studentId)) {
        store.set(studentId, []);
    }
    return store.get(studentId);
}

function seedDemo(studentId) {
    const list = ensureStudent(studentId);
    if (list.length > 0) return;
    const now = new Date().toISOString();
    list.push(
        {
            id: uuidv4(),
            type: 'Placement',
            message: 'Campus hiring session next week — register on the portal.',
            isRead: false,
            createdAt: now,
        },
        {
            id: uuidv4(),
            type: 'Event',
            message: 'Department seminar moved to the main auditorium.',
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: uuidv4(),
            type: 'Result',
            message: 'Mid-term grades are published.',
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
        }
    );
}

function listForStudent(studentId, typeFilter) {
    seedDemo(studentId);
    let rows = [...ensureStudent(studentId)].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    if (typeFilter) {
        if (!VALID_TYPES.has(typeFilter)) {
            const err = new Error('Invalid type. Use Placement, Event, or Result.');
            err.statusCode = 400;
            throw err;
        }
        rows = rows.filter((r) => r.type === typeFilter);
    }
    const unread = rows.filter((r) => !r.isRead).length;
    return {
        notifications: rows.map((r) => ({
            id: r.id,
            type: r.type,
            message: r.message,
            isRead: r.isRead,
            createdAt: r.createdAt,
        })),
        total: rows.length,
        unread,
    };
}

function unreadCount(studentId) {
    seedDemo(studentId);
    return ensureStudent(studentId).filter((r) => !r.isRead).length;
}

function markRead(studentId, id) {
    seedDemo(studentId);
    const row = ensureStudent(studentId).find((r) => r.id === id);
    if (!row) {
        const err = new Error('Notification not found');
        err.statusCode = 404;
        throw err;
    }
    row.isRead = true;
    return { id: row.id, isRead: true };
}

function markAllRead(studentId) {
    seedDemo(studentId);
    const list = ensureStudent(studentId);
    let n = 0;
    for (const r of list) {
        if (!r.isRead) {
            r.isRead = true;
            n += 1;
        }
    }
    return { message: 'All notifications marked as read', updatedCount: n };
}

/**
 * Insert a notification and return the row (for WebSocket push).
 */
function addNotification(studentId, type, message) {
    if (!VALID_TYPES.has(type)) {
        const err = new Error('Invalid type');
        err.statusCode = 400;
        throw err;
    }
    const row = {
        id: uuidv4(),
        type,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    ensureStudent(studentId).unshift(row);
    return row;
}

module.exports = {
    listForStudent,
    unreadCount,
    markRead,
    markAllRead,
    addNotification,
    VALID_TYPES,
};
