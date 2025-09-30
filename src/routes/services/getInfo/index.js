const express = require('express');
const router = express.Router();

const rateLimiter = require('../../../middleware/rateLimiter')

const getInfo = require('./getInfo');
const fetchUsers = require('../messages/fetchUsers')

router.use(rateLimiter);

router.use('/getinfo', getInfo);
router.use('/messaging_users', fetchUsers);

module.exports = router;
