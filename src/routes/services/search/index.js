const express = require('express');
const router = express.Router();

const searchStudents = require('./searchStudents');
const searchMentors = require('./searchMentor');
const searchUser = require('./searchUser');

router.use('/student', searchStudents);
router.use('/mentor', searchMentors);
router.use('/user', searchUser);

module.exports = router;