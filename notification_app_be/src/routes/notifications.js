const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markOneRead);
router.get('/', notificationController.list);

module.exports = router;
