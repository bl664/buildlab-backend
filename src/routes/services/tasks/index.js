const express = require('express');
const router = express.Router();

const addTask = require('../../services/tasks/addTask');
const getMentorTasks = require('../../services/tasks/getMentorTasks');
const getStudentTasks = require('../../services/tasks/getStudentTasks');
const updateTask = require('../../services/tasks/updateTask');
const deleteTask = require('../../services/tasks/deleteTask');
const getPendingTaskCount = require('../../services/tasks/getPendingTaskCount');
const fetchTaskByID = require('../../services/tasks/fetchTaskByID');
const taskStatusCountStudent = require('../../services/tasks/taskStatusCountStudent');

// Comments
const createComment = require('../../services/tasks/comments/createComment');
const fetchTaskComment = require('../../services/tasks/comments/fetchTaskComments');
const deleteTaskComment = require('../../services/tasks/comments/deleteTaskComment');

// Tasks CRUD
router.use('/', addTask);
router.use('/', updateTask);
router.use('/', deleteTask);

// Fetch
router.use('/mentor', getMentorTasks);
router.use('/student', getStudentTasks);
router.use('/task-by-id', fetchTaskByID);
router.use('/pending-tasks-count', getPendingTaskCount);
router.use('/count/student', taskStatusCountStudent);

// Comments
router.use('/task-comment', createComment);
router.use('/task-comment', fetchTaskComment);
router.use('/task-comment', deleteTaskComment);

module.exports = router;
