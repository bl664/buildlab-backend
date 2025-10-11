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
const rejectStudentRequest = require('./rejectGroupRequest')
const fetchGroupById = require('./fetchGroupById')
const fetchGroupMembers = require('./fetchGroupMembers')
const deleteGroup = require('./deleteGroup')
const updateGroup = require('./updateGroup')

router.use('/', createGroup);
router.use('/', deleteGroup)
router.use('/', updateGroup)
router.use('/mentor', fetchMentorGroups);
router.use('/mentor/has-group', hasMentorGroup);
router.use('/mentor/requests-group', fetchRequestsGroup);
router.use('/mentor/pending-requests-count',pendingGroupRequestsCount);
router.use('/approve-group-request', approveStundentRequest)
router.use('/reject', rejectStudentRequest)
router.use('/student', fetchStudentGroups);
router.use('/student/has-group', hasStudentGroup);
router.use('/student/group-invite', studentGroupInvite);
router.use('/student/last-request-time',studentLastRequestTime);
router.use('/student/request-status',studentRequestStatus);
router.use('/id', fetchGroupById)
router.use('/members', fetchGroupMembers)


module.exports = router;
