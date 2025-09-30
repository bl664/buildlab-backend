const express = require('express');
const router = express.Router();

const createNotification = require('./createNotification');
const getNotifications = require('./getNotification');
const updateNotification = require('./updateNotification');
const projectStatusNotifications = require('./createNotificationsForProjectStatus');

router.use('/', createNotification);
router.use('/', getNotifications);
router.use('/', updateNotification);
router.use('/project-status', projectStatusNotifications);

module.exports = router;
