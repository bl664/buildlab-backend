const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth')

const securityMiddleware = require('../middleware/securityMiddleware')
const authRoutes = require('./services/auth');
const projectRoutes = require('./services/project');
const taskRoutes = require('./services/tasks');
const teamRoutes = require('./services/teams');
const groupRoutes = require('./services/groups');
const meetingRoutes = require('./services/meetings');
const notificationRoutes = require('./services/notification');
const messageRoutes = require('./services/messages');
const githubRoutes = require('./services/github');
const settingRoutes = require('./services/setting');
const dailyTaskRoutes = require('./services/dailyTask');
const userInfo = require('./services/getInfo')
const userSearch = require('./services/search');

router.use(securityMiddleware);

router.use('/auth', authRoutes);
router.use('/user', authMiddleware,userInfo)
router.use('/project', authMiddleware, projectRoutes);
router.use('/task', authMiddleware, taskRoutes);
router.use('/team', authMiddleware, teamRoutes);
router.use('/group', authMiddleware, groupRoutes);
router.use('/meeting', authMiddleware, meetingRoutes);
router.use('/notification', authMiddleware, notificationRoutes);
router.use('/message', authMiddleware, messageRoutes);
router.use('/api', authMiddleware, githubRoutes);
router.use('/setting', authMiddleware, settingRoutes);
router.use('/daily-tasks', authMiddleware, dailyTaskRoutes);
router.use('/search', authMiddleware, userSearch)

module.exports = router;


// const express = require('express');
// const signin = require('./services/auth/signin');
// const signup = require('./services/auth/signup');
// const getInfo = require('./services/getInfo/getInfo')
// const addProject = require('./services/project/addProject');
// const getAllStudents = require('./services/users/getAllUsers')
// const getProjectsMentor = require('./services/project/getProjectsMentor')
// const addTask = require('./services/tasks/addTask')
// const getMentorTasks = require('./services/tasks/getMentorTasks')
// const getPendingTaskCount = require('./services/tasks/getPendingTaskCount');
// const updateTask = require('./services/tasks/updateTask');
// const createTeam = require('./services/teams/createTeam');
// const fetchTeams = require('./services/teams/getTeams');
// const fetchAllMentors = require('./services/mentors/getAllMentors')
// const getStudentProjects = require('./services/project/getStudentProjects')
// const getProjectById = require('./services/project/getProjectByID')
// const updateProject = require('./services/project/updateProject')
// const fetchedTeamByID = require('./services/teams/getTeamById')
// const getStudentTeams = require('./services/teams/getStudentTeams')
// const getStudentTasks = require('./services/tasks/getStudentTasks')
// const fetchUsers = require('./services/messages/fetchUsers');
// const fetchMesssags = require('./services/messages/fetchMessages');
// const createNotification = require('./services/notification/createNotification');
// const fetchNotications = require('./services/notification/getNotification')
// const updateNotification = require('./services/notification/updateNotification');
// const deleteProject = require('./services/project/deleteProject');
// const githubLogin = require('../api/github/login/route')
// const githubCallback = require('../api/github/callback/route')
// const addCollaborator = require('../api/github/add-collaborator/route')
// const checkGithubConnection = require('./services/github/checkGitHubConnection')
// const projectstatusnotifications = require('./services/notification/createNotificationsForProjectStatus')
// const projectsCountStudent = require('./services/project/activeProjectsCount');
// const fetchTaskByID = require('./services/tasks/fetchTaskByID')
// const taskStatusCountStudent = require('./services/tasks/taskStatusCountStudent')
// const updateTeam = require('./services/teams/updateTeam')
// const deleteTeam = require('./services/teams/deleteTeam')
// const fetchTeamStudents = require('./services/teams/fetchTeamStudents')
// const deleteTask = require('./services/tasks/deleteTask')
// const updateDetails = require('./services/setting/updateDetails')
// const updatePassword = require('./services/setting/updatePassword');
// const fetchUserDetails = require('./services/setting/fetchUserDetails');
// const createDailyTask = require('./services/dailyTask/createDailyTask');
// const updateDailyTask = require('./services/dailyTask/updateDailyTask');
// const fetchDailyTasks = require('./services/dailyTask/fetchDailyTask');
// const deleteDailyTask = require('./services/dailyTask/deleteDailyTask');
// const createComment = require('./services/tasks/comments/createComment')
// const fetchTaskComment = require('./services/tasks/comments/fetchTaskComments');
// const deleteTaskComment = require('./services/tasks/comments/deleteTaskComment')
// const searchStudents = require('./services/search/searchStudents')
// const searchMentors = require('./services/search/searchMentor')
// const deleteProjectForcefully = require('./services/project/deleteProjectForceFully') 
// const createMeeting = require('./services/meetings/createMeeting')
// const fetchMeetingsMentor = require('./services/meetings/fetchMeetingsMentor')
// const fetchMeetingsStudent = require('./services/meetings/fetchMeetingsStudents')
// // const fetchMeetingByID = require('./services/meetings/getMeetingByID')
// // const updateMeeting = require('./services/meetings/updateMeeting')
// const deleteMeeting = require('./services/meetings/deleteMeeting')
// const getMeetingParticipants =require('./services/meetings/getParticipants')
// const mentorMeetingsCount = require('./services/meetings/mentorMeetingsCount')
// const createGroup = require('./services/groups/createGroup')
// const fetchMentorGroups = require('./services/groups/fetchGroups')
// const fetchGroupById = require('./services/groups/fetchGroupById')
// const updateGroup = require('./services/groups/updateGroup')
// const deleteGroup = require('./services/groups/deleteGroup')
// const hasMentorGroup = require('./services/groups/hasGroup')
// const fetchStudentGroups = require('./services/groups/fetchStudentGroups')
// const hasStudentGroup = require('./services/groups/hasStudentGroup')
// const studentGroupInvite = require('./services/groups/studentGroupInvite')
// const fetchRequestsGroup = require('./services/groups/requestsGroup')
// const approveStundentRequest = require('./services/groups/approveGroupRequest')
// const studentLastRequestTime = require('./services/groups/studentLastRequestTime')
// const studentRequestStatus = require('./services/groups/studentRequestStatus')
// const rejectGroupRequest = require('./services/groups/rejectGroupRequest')
// const fetchTeamsForProject = require('./services/teams/fetchTeamsForProject')
// const userSearch = require('./services/search/searchUser');
// const pendingGroupRequestsCount = require('./services/groups/pendingGroupRequestsCount')
// const deleteGithub = require('./services/github/disconenctGithub')
// const logout = require('./services/auth/logout')
// const mentorTeamsCount = require('./services/teams/fetchTeamsCountMentor');

// const projectCountsForMentor = require('./services/project/projectCountsForMentor')
// const getActiveProjects = require('./services/project/getActiveProjectsMentor')
// const getActiveProjectsStudents = require('./services/project/getActiveProjectsStudents')

// const router = express.Router();

// router.use('/auth/signin', signin);
// router.use('/auth/signup', signup);
// router.use('/auth/logout', logout);


// router.use('/user/getinfo', getInfo);
// router.use('user/messaging_users', fetchUsers) // /fetchmessagesusers

// // Projects
// router.use('/project', addProject); // /project
// router.use('/project/mentor', getProjectsMentor) // /get-projects-mentor
// router.use('/project/student', getStudentProjects) // /projects-student
// router.use('/project/project-by-id', getProjectById)
// router.use('/project', updateProject)
// router.use('/project', deleteProject)
// router.use('/project/counts/student', projectsCountStudent) // projects-counts-student
// router.use('/project/delete-forcefully', deleteProjectForcefully) // /deleteprojectforcefully
// router.use('/project/counts/mentor', projectCountsForMentor)// /project-counts
// router.use('/project/active/mentor', getActiveProjects) // /active-projects-mentor
// router.use('/project/active/student', getActiveProjectsStudents)// /active-projects-student

// // tasks
// router.use('/task', addTask) // /addtask
// router.use('/task/mentor', getMentorTasks) // /gettasks
// router.use('/task/pending-tasks-count', getPendingTaskCount)// /getpendingtaskcount
// router.use('/task', updateTask) // /updatetask
// router.use('/task/student',getStudentTasks) // /getstudenttasks
// router.use('/task/task-by-id', fetchTaskByID) // /fetchtaskbyid
// router.use('/task/count/student', taskStatusCountStudent) // /taskstatuscount
// router.use('/task', deleteTask) // /deleteTask
// router.use('/task/task-comment', createComment)
// router.use('/task/task-comment', fetchTaskComment)
// router.use('/task/task-comment', deleteTaskComment)

// // team
// router.use('/team', createTeam) // /createteam
// router.use('/team/mentor', fetchTeams) // /fetchteams
// router.use('/team/team-by-id', fetchedTeamByID) // /fetchteambyid
// router.use('/team/student', getStudentTeams) // /fetchstudentteams
// router.use('/team', updateTeam) // /updateteam
// router.use('/team', deleteTeam) // /deleteteam
// router.use('/team/team-students', fetchTeamStudents) // /fetchteamstudents
// router.use('/team/fetch-teams-for-project', fetchTeamsForProject) // Need to check.....................
// router.use('/team/count/mentor', mentorTeamsCount);// /mentor-teams-count

// // router.use('/signout', authenticate, signout); 
// // router.use('/verify_auth', authenticate, verifyAuth);

// // messages

// router.use('/message', fetchMesssags) // /messages
// router.use('/search/student', searchStudents) // /search-student
// router.use('/search/mentor', searchMentors) // /search-mentor
// router.use('/search/user', userSearch) // /search-user

// // Notification
// router.use('/notification', createNotification) // /createnotification
// router.use('/notification', fetchNotications) // /fetchnotifications
// router.use('/notification', updateNotification) // /updatenotification
// router.use('/notification/projectstatusnotifications', projectstatusnotifications)

// // Github
// // router.use('/auth/github', githubOAuth)
// router.use('/api/github/login', githubLogin)
// router.use('/api/auth/github/callback', githubCallback)
// // router.use('/api/github/create-repo', createRepo)
// router.use('/api/github/add-collaborator', addCollaborator)
// router.use('/api/github/check-connection', checkGithubConnection) // /checkgithubconnection
// router.use('/api/github/disconnect', deleteGithub)

// // settings
// router.use('/setting/profile-details', updateDetails)  // /updateProfileDetails
// router.use('/setting/password', updatePassword) // /updatepassword
// router.use('/setting/user-details', fetchUserDetails)

// // Daily tasks
// router.use('/daily-tasks', createDailyTask);
// router.use('/daily-tasks', fetchDailyTasks);
// router.use('/daily-tasks', deleteDailyTask);
// router.use('/daily-tasks', updateDailyTask);

// // Meetings
// router.use('/meeting', createMeeting) 
// router.use('/meeting/mentor', fetchMeetingsMentor) // /meetings/mentor'
// router.use('/meeting/student', fetchMeetingsStudent)// /meeting/meetings/student
// // router.use('/meeting', updateMeeting) 
// router.use('/meeting', deleteMeeting) 
// router.use('/meeting/participants', getMeetingParticipants)
// router.use('/meeting/count', mentorMeetingsCount) // /meetings/count

// // Groups
// router.use('/group', createGroup) 
// router.use('/group/mentor', fetchMentorGroups) 
// // router.use('/group', fetchGroupById) // fetch group by id
// router.use('/group/mentor/has-group', hasMentorGroup) // /has-group

// router.use('/group/student', fetchStudentGroups) // /student-groups

// router.use('/group/student/has-group', hasStudentGroup) // /student-has-group

// router.use('/group/student/group-invite', studentGroupInvite) // /student-group-invite

// router.use('/group/mentor/requsts-group', fetchRequestsGroup) // /requsts-group

// router.use('/group/approve-group-request', approveStundentRequest)

// router.use('/group/student/last-request-time', studentLastRequestTime) // /student-last-request-time

// router.use('/group/student/request-status', studentRequestStatus) // /student-request-status

// router.use('/group/mentor/pending-requests-count', pendingGroupRequestsCount) // /request-pending-group-count
// module.exports = router;