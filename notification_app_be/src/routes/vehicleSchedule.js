const express = require('express');
const { getSchedule } = require('../controllers/vehicleScheduleController');

const router = express.Router();

router.get('/', getSchedule);

module.exports = router;
