const express = require('express');
const router = express.Router();
const apiLimiter = require('../../../middleware/rateLimiter')

const createDailyTask = require('./createDailyTask');
const fetchDailyTasks = require('./fetchDailyTask');
const updateDailyTask = require('./updateDailyTask');
const deleteDailyTask = require('./deleteDailyTask');

router.use(apiLimiter);

router.use('/', createDailyTask);   // POST /daily-tasks
router.use('/', fetchDailyTasks);    // GET /daily-tasks
router.use('/', updateDailyTask);   // PUT /daily-tasks/:id
router.use('/', deleteDailyTask);   // DELETE /daily-tasks/:id

module.exports = router;
