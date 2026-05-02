const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { setAuthToken } = require('logging-middleware');
const { fireLog } = require('./src/utils/fireLog');

const config = require('./src/config');
const { getEvaluationToken } = require('./src/utils/evalAuth');
const { studentAuth } = require('./src/middleware/auth');
const { errorHandler } = require('./src/middleware/errorHandler');
const notificationsRouter = require('./src/routes/notifications');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/api/notifications', studentAuth, notificationsRouter);

app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, {
    path: '/notifications/socket.io',
    cors: { origin: '*' },
});

function roomForStudent(studentId) {
    return `student_${studentId}`;
}

io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token || token !== config.apiStudentBearer) {
        return next(new Error('Unauthorized'));
    }
    socket.studentId = config.studentId;
    return next();
});

io.on('connection', (socket) => {
    const sid = socket.studentId;
    socket.join(roomForStudent(sid));
    fireLog('backend', 'info', 'handler', `Socket connected for student ${sid}`);
    socket.emit('connected', { studentId: sid });
    socket.on('disconnect', () => {
        fireLog('backend', 'info', 'handler', `Socket disconnected for student ${sid}`);
    });
});

app.locals.io = io;
app.locals.emitNewNotification = function emitNewNotification(studentId, payload) {
    io.to(roomForStudent(studentId)).emit('new_notification', payload);
};

async function start() {
    let loggingReady = false;
    try {
        const token = await getEvaluationToken();
        setAuthToken(token);
        loggingReady = true;
        fireLog('backend', 'info', 'config', 'Evaluation auth token set; logging enabled');
    } catch (e) {
        process.stderr.write(
            `[startup] Could not obtain evaluation token (${e.message}). ` +
                'Log() calls will fail until CLIENT_ID, CLIENT_SECRET, EMAIL, ROLL_NO, ACCESS_CODE are set in .env.\n'
        );
    }

    server.listen(config.port, () => {
        if (loggingReady) {
            fireLog('backend', 'info', 'route', `Server listening on port ${config.port}`);
        } else {
            process.stderr.write(`[startup] HTTP server listening on port ${config.port} (logging to evaluation disabled)\n`);
        }
    });
}

start().catch((e) => {
    process.stderr.write(`[startup] Fatal: ${e.message}\n`);
    process.exit(1);
});
