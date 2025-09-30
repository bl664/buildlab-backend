const express = require('express');
const router = express.Router();

const fetchMessages = require('./fetchMessages');

router.use('/', fetchMessages);

module.exports = router;
