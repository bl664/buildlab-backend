const express = require('express');
const signin = require('./auth/signin');
const signup = require('./auth/signup');
const getInfo = require('./services/getInfo/getInfo')
const addProject = require('./services/project/addProject');
const getAllStudents = require('./services/users/getAllUsers')
const getProjects = require('./services/project/getProjects')
const addTask = require('./services/tasks/addTask')
const getTasks = require('./services/tasks/getTasks')
const getPendingTaskCount = require('./services/tasks/getPendingTaskCount');
const updateTask = require('./services/tasks/updateTask');
const createTeam = require('./services/teams/createTeam');
const fetchTeams = require('./services/teams/getTeams');
const fetchAllMentors = require('./services/mentors/getAllMentors')
const getStudentProjects = require('./services/project/getStudentProjects')
const getProjectById = require('./services/project/getProjectByID')
const updateProject = require('./services/project/updateProject')
const fetchedTeamByID = require('./services/teams/getTeamById')
const getStudentTeams = require('./services/teams/getStudentTeams')
const getStudentTasks = require('./services/tasks/getStudentTasks')
const fetchUsers = require('./services/messages/fetchUsers');
const fetchMesssags = require('./services/messages/fetchMessages');
const createNotification = require('./services/notification/createNotification');
const fetchNotications = require('./services/notification/getNotification')
const updateNotification = require('./services/notification/updateNotification');
const deleteProject = require('./services/project/deleteProject');
const githubLogin = require('../api/github/login/route')
const githubCallback = require('../api/github/callback/route')
const addCollaborator = require('../api/github/add-collaborator/route')
const checkGithubConnection = require('./services/github/checkGitHubConnection')
const projectstatusnotifications = require('./services/notification/createNotificationsForProjectStatus')
const projectsCountStudent = require('./services/project/activeProjectsCount');
const fetchTaskByID = require('./services/tasks/fetchTaskByID')
const taskStatusCount = require('./services/tasks/taskStatusCount')
const updateTeam = require('./services/teams/updateTeam')
const deleteTeam = require('./services/teams/deleteTeam')
const fetchTeamStudents = require('./services/teams/fetchTeamStudents')
const deleteTask = require('./services/tasks/deleteTask')
const updateName = require('./services/setting/updateName')
const updatePassword = require('./services/setting/updatePassword');
const fetchUserDetails = require('./services/setting/fetchUserDetails');
const createDailyTask = require('./services/dailyTask/createDailyTask');
const updateDailyTask = require('./services/dailyTask/updateDailyTask');
const fetchDailyTasks = require('./services/dailyTask/fetchDailyTassk');
const deleteDailyTask = require('./services/dailyTask/DeleteDailyTask');
const createComment = require('./services/tasks/comments/createComment')
const fetchTaskComment = require('./services/tasks/comments/fetchTaskComments');
const deleteTaskComment = require('./services/tasks/comments/deleteTaskComment')
const searchStudents = require('./services/messages/searchStudents')
const searchMentors = require('./services/messages/searchMentor')
const deleteProjectForcefully = require('./services/project/deleteProjectForceFully') 
const createMeeting = require('./services/meetings/createMeeting')
const fetchMeetingsMentor = require('./services/meetings/fetchMeetingsMentor')
const fetchMeetingsStudent = require('./services/meetings/fetchMeetingsStudents')
// const fetchMeetingByID = require('./services/meetings/getMeetingByID')
const updateMeeting = require('./services/meetings/updateMeeting')
const deleteMeeting = require('./services/meetings/deleteMeeting')
const getMeetingParticipants =require('./services/meetings/getParticipants')
const mentorMeetingsCount = require('./services/meetings/mentorMeetingsCount')
const createGroup = require('./services/groups/createGroup')
const fetchGroups = require('./services/groups/fetchGroups')
const fetchGroupById = require('./services/groups/fetchGroupById')
const updateGroup = require('./services/groups/updateGroup')
const deleteGroup = require('./services/groups/deleteGroup')
const hasGroup = require('./services/groups/hasGroup')
const fetchStudentGroups = require('./services/groups/fetchStudentGroups')
const hasStudentGroup = require('./services/groups/hasStudentGroup')
const studentGroupInvite = require('./services/groups/studentGroupInvite')
const fetchRequestsGroup = require('./services/groups/requestsGroup')
const approveStundentRequest = require('./services/groups/approveGroupRequest')
const studentLastRequestTime = require('./services/groups/studentLastRequestTime')
const studentRequestStatus = require('./services/groups/studentRequestStatus')
const rejectGroupRequest = require('./services/groups/rejectGroupRequest')
const fetchTeamsForProject = require('./services/teams/fetchTeamsForProject')
const userSearch = require('./services/messages/searchUser');
const pendingGroupRequestsCount = require('./services/groups/pendingGroupRequestsCount')
const deleteGithub = require('./services/github/disconenctGithub')
const logout = require('./auth/logout')
const mentorTeamsCount = require('./services/teams/fetchTeamsCountMentor');

const projectCountsForMentor = require('./services/project/projectCountsForMentor')
const getActiveProjects = require('./services/project/getActiveProjectsMentor')
const getActiveProjectsStudents = require('./services/project/getActiveProjectsStudents')

const router = express.Router();


router.use('/signin', signin);
router.use('/signup', signup);
router.use('/logout', logout);
router.use('/getinfo', getInfo);

// Projects
router.use('/project', addProject);
router.use('/getallstudents', getAllStudents);
router.use('/get-projects-mentor', getProjects)
router.use('/projects-student', getStudentProjects)
router.use('/project-by-id', getProjectById)
router.use('/project', updateProject)
router.use('/project', deleteProject)
router.use('/projects-counts-student', projectsCountStudent)
router.use('/deleteprojectforcefully', deleteProjectForcefully)
router.use('/project-counts', projectCountsForMentor)
router.use('/active-projects-mentor', getActiveProjects)
router.use('/active-projects-student', getActiveProjectsStudents)

// tasks
router.use('/addtask', addTask)
router.use('/gettasks', getTasks)
router.use('/getpendingtaskcount', getPendingTaskCount)
router.use('/updatetask', updateTask)
router.use('/getstudenttasks',getStudentTasks)
router.use('/fetchtaskbyid', fetchTaskByID)
router.use('/taskstatuscount', taskStatusCount)
router.use('/deleteTask', deleteTask)
router.use('/task-comment', createComment)
router.use('/task-comment', fetchTaskComment)
router.use('/task-comment', deleteTaskComment)

// team
router.use('/createteam', createTeam)
router.use('/fetchteams', fetchTeams)
router.use('/fetchteambyid', fetchedTeamByID)
router.use('/fetchstudentteams', getStudentTeams)
router.use('/updateteam', updateTeam)
router.use('/deleteteam', deleteTeam)
router.use('/fetchteamstudents', fetchTeamStudents)
router.use('/fetch-teams-for-project', fetchTeamsForProject)
router.use('/mentor-teams-count', mentorTeamsCount);
// mentors
router.use('/getallmentors', fetchAllMentors);
// router.use('/signout', authenticate, signout); 
// router.use('/verify_auth', authenticate, verifyAuth);

// messages
router.use('/fetchmessagesusers', fetchUsers)
router.use('/messages', fetchMesssags)
router.use('/search-student', searchStudents)
router.use('/search-mentor', searchMentors)
router.use('/search-user', userSearch)

// Notification
router.use('/createnotification', createNotification)
router.use('/fetchnotifications', fetchNotications)
router.use('/updatenotification', updateNotification)
router.use('/projectstatusnotifications', projectstatusnotifications)

// Github
// router.use('/auth/github', githubOAuth)
router.use('/api/github/login', githubLogin)
router.use('/api/auth/github/callback', githubCallback)
// router.use('/api/github/create-repo', createRepo)
router.use('/api/github/add-collaborator', addCollaborator)
router.use('/checkgithubconnection', checkGithubConnection)
router.use('/api/github/disconnect', deleteGithub)

// settings
router.use('/updateProfileDetails', updateName)
router.use('/updatepassword', updatePassword)
router.use('/user-details', fetchUserDetails)

// Daily tasks
router.use('/daily-tasks', createDailyTask);
router.use('/daily-tasks', fetchDailyTasks);
router.use('/daily-tasks', deleteDailyTask);
router.use('/daily-tasks', updateDailyTask);

// Meetings
router.use('/meeting', createMeeting) // create
router.use('/meetings/mentor', fetchMeetingsMentor) // fetch mentor
router.use('/meetings/student', fetchMeetingsStudent) // fetch Students meetings
router.use('/meeting', updateMeeting) // update
router.use('/meeting', deleteMeeting) // delete
router.use('/meeting/participants', getMeetingParticipants)
router.use('/meetings/count', mentorMeetingsCount)
// router.use('/meeting', fetchMeetingByID) //fetchbyid
// router.use('/meetings') //today's meetings
// router.use('/meeting') //meeting 

// Groups
router.use('/group', createGroup) // create group
router.use('/groups', fetchGroups) // fetch all groups
// router.use('/group', fetchGroupById) // fetch group by id
// router.use('/group', updateGroup) // update group
// router.use('/group', deleteGroup) // delete group
router.use('/has-group', hasGroup)
router.use('/student-groups', fetchStudentGroups)
router.use('/student-has-group', hasStudentGroup)
router.use('/student-group-invite', studentGroupInvite)
router.use('/requsts-group', fetchRequestsGroup)
router.use('/approve-group-request', approveStundentRequest)
router.use('/student-last-request-time', studentLastRequestTime)
router.use('/student-request-status', studentRequestStatus)
router.use('/request-pending-group-count', pendingGroupRequestsCount)
module.exports = router;