const express = require('express');
const router = express.Router();

const createMeeting = require('./createMeeting');
// const updateMeeting = require('./updateMeeting');
const deleteMeeting = require('./deleteMeeting');
const fetchMeetingsMentor = require('./fetchMeetingsMentor');
const fetchMeetingsStudents = require('./fetchMeetingsStudents');
const getParticipants = require('./getParticipants');
const meetingsCount = require('./mentorMeetingsCount');

router.use('/', createMeeting);
// router.use('/', updateMeeting);
router.use('/', deleteMeeting);

router.use('/mentor', fetchMeetingsMentor);
router.use('/student', fetchMeetingsStudents);
router.use('/participants', getParticipants);

router.use('/count', meetingsCount);

module.exports = router;
