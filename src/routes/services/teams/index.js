const express = require('express');
const router = express.Router();

const createTeam = require('./createTeam');
const updateTeam = require('./updateTeam');
const deleteTeam = require('./deleteTeam');
const fetchMentorTeams = require('./getTeams');
const getTeamById = require('./getTeamById');
const fetchStudentTeams = require('./getStudentTeams');
const fetchTeamStudents = require('./fetchTeamStudents');
const fetchTeamsForProject = require('./fetchTeamsForProject');
const mentorTeamsCount = require('./fetchTeamsCountMentor');

router.use('/', createTeam);
router.use('/', updateTeam);
router.use('/', deleteTeam);

router.use('/mentor', fetchMentorTeams);
router.use('/student', fetchStudentTeams);
router.use('/team-by-id', getTeamById);

router.use('/team-students', fetchTeamStudents);
router.use('/fetch-teams-for-project', fetchTeamsForProject);

router.use('/count/mentor', mentorTeamsCount);

module.exports = router;
