const express = require('express');
const router = express.Router();

const addProject = require('../../services/project/addProject');
const getProjectsMentor = require('../../services/project/getProjectsMentor');
const getStudentProjects = require('../../services/project/getStudentProjects');
const getProjectById = require('../../services/project/getProjectByID');
const updateProject = require('../../services/project/updateProject');
const deleteProject = require('../../services/project/deleteProject');
const deleteProjectForcefully = require('../../services/project/deleteProjectForceFully');
const projectsCountStudent = require('../../services/project/activeProjectsCount');
const projectCountsForMentor = require('../../services/project/projectCountsForMentor');
const getActiveProjectsMentor = require('../../services/project/getActiveProjectsMentor');
const getActiveProjectsStudents = require('../../services/project/getActiveProjectsStudents');

// CRUD
router.use('/', addProject);
router.use('/', updateProject);
router.use('/', deleteProject);
router.use('/delete-forcefully', deleteProjectForcefully);

// Fetching
router.use('/mentor', getProjectsMentor);
router.use('/student', getStudentProjects);
router.use('/project-by-id', getProjectById);

// Counts / Stats
router.use('/counts/student', projectsCountStudent);
router.use('/counts/mentor', projectCountsForMentor);
router.use('/active/mentor', getActiveProjectsMentor);
router.use('/active/student', getActiveProjectsStudents);

module.exports = router;
