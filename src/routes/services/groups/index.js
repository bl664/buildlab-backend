const express = require('express');
const router = express.Router();

const createGroup = require('./createGroup')
const fetchMentorGroups = require('./fetchGroups')
const hasMentorGroup = require('./hasGroup')
const fetchStudentGroups = require('./fetchStudentGroups')
const hasStudentGroup = require('./hasStudentGroup')
const studentGroupInvite = require('./studentGroupInvite')
const fetchRequestsGroup = require('./requestsGroup')
const approveStundentRequest = require('./approveGroupRequest')
const studentLastRequestTime = require('./studentLastRequestTime')
const studentRequestStatus = require('./studentRequestStatus')
const pendingGroupRequestsCount = require('./pendingGroupRequestsCount')

router.use('/', createGroup);
router.use('/mentor', fetchMentorGroups);
router.use('/mentor/has-group', hasMentorGroup);
router.use('/mentor/requests-group', fetchRequestsGroup);
router.use('/mentor/pending-requests-count',pendingGroupRequestsCount);
router.use('/approve-group-request', approveStundentRequest)
router.use('/student', fetchStudentGroups);
router.use('/student/has-group', hasStudentGroup);
router.use('/student/group-invite', studentGroupInvite);
router.use('/student/last-request-time',studentLastRequestTime);
router.use('/student/request-status',studentRequestStatus);

module.exports = router;
