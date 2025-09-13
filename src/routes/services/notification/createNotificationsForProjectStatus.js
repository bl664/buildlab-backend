// Updated route file with socket integration
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { getStudentIdsByProjectId } = require('./helpers/getStudentsIds');
const { queryDatabase } = require('../../../services/dbQuery');
const { users } = require('../../messages/socket');

router.use(authMiddleware);

const createNotification = async (user_id, type, content, created_by, is_read, studentsData, mentorData, url) => {
    console.log("noti data is", user_id, type, content, created_by, is_read, studentsData, mentorData, url);

    const query = `
        INSERT INTO notifications 
        (created_for_id, type, content, created_by, is_read, students_list, mentors_list, url) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *;
    `;

    const values = [user_id, type, content, created_by, is_read, studentsData, mentorData, url];
    const result = await queryDatabase(query, values);
    return result[0];
};

// Function to emit real-time notification
const emitNotificationToUser = (io, userId, notificationData) => {
    if (!io) {
        console.warn("Socket.IO instance not available");
        return false;
    }

    const userSocketId = users.get(userId);
    if (userSocketId) {
        try {
            io.to(userSocketId).emit("receiveNotification", notificationData);
            console.log(`Real-time notification sent to user ${userId}`);
            return true;
        } catch (error) {
            console.log(`User ${userId} is not online, notification stored in database only`);
            return false;
        }
    }
    return false;
};

router.post('/', async (req, res) => {
    console.log("Creating notification for project status");

    const { id: projectId } = req.body;
    console.log("project id for notification is ", projectId);

    if (!projectId) {
        return res.status(400).json({
            success: false,
            error: "Project ID is required"
        });
    }

    try {
        const { students_ids, project_name, creator } = await getStudentIdsByProjectId(projectId);

        if (!students_ids || students_ids.length === 0) {
            console.warn(`No students found for project ${projectId}`);
        }

        console.log("Successfully fetched project data");
        console.log("studentsIds", students_ids, project_name, creator);

        const mentor_query = `SELECT mentor_id FROM mentor_projects WHERE project_id = $1`;
        const mentorValue = [projectId];
        const mentorResult = await queryDatabase(mentor_query, mentorValue);

        if (!mentorResult || mentorResult.length === 0) {
            throw new Error(`No mentor found for project ${projectId}`);
        }


        const mentorIdArray = mentorResult.map(r => r.mentor_id);
        console.log("mentor id ", mentorIdArray);

        const createdNotifications = [];
        const io = req.app.get('io'); // Get io instance

        let onlineCount = 0;
        let offlineCount = 0;

        if (creator.role === 'student') {
            // Notify mentor once
            const content = `Project ${project_name} has been created and is pending for approval.`;
            const mentorNotification = await createNotification(
                mentorIdArray[0], // send to mentor
                "Project created",
                content,
                creator.id,
                false,
                students_ids,
                mentorIdArray,
                `/projects/${projectId}`
            );

            createdNotifications.push(mentorNotification);

            const notificationPayload = {
                id: mentorNotification.id,
                type: mentorNotification.type,
                content: mentorNotification.content,
                created_by: mentorNotification.created_by,
                created_at: mentorNotification.created_at,
                url: mentorNotification.url,
                is_read: mentorNotification.is_read,
                creator_name: creator.name
            };

            const wasSentRealtime = emitNotificationToUser(io, mentorIdArray[0], notificationPayload);
            wasSentRealtime ? onlineCount++ : offlineCount++;

        } else {
            // Creator is mentor, notify all students
            for (let i = 0; i < students_ids.length; i++) {
                const content = `Project ${project_name} is created and assigned to you.`;
                const notificationData = await createNotification(
                    students_ids[i],
                    "Project created",
                    content,
                    creator.id,
                    false,
                    [],
                    mentorIdArray,
                    `/projects/${projectId}`
                );

                createdNotifications.push(notificationData);

                const notificationPayload = {
                    id: notificationData.id,
                    type: notificationData.type,
                    content: notificationData.content,
                    created_by: notificationData.created_by,
                    created_at: notificationData.created_at,
                    url: notificationData.url,
                    is_read: notificationData.is_read,
                    creator_name: creator.name
                };

                const wasSentRealtime = emitNotificationToUser(io, students_ids[i], notificationPayload);
                wasSentRealtime ? onlineCount++ : offlineCount++;
            }
        }

        res.json({
            success: true,
            message: "Notifications created successfully",
            notifications: createdNotifications,
            studentIds: students_ids,
            stats: {
                total: createdNotifications.length,
                sentRealtime: onlineCount,
                storedForOffline: offlineCount
            }
        });

    } catch (error) {
        console.error("Error creating notifications:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create notifications",
            details: error.message
        });
    }
});


// router.post('/', async (req, res) => {
//     console.log("Creating notification for project status");

//     const { id: projectId } = req.body;
//     console.log("project id for notification is ", projectId)

//     try {
//         const { students_ids, project_name, creator } = await getStudentIdsByProjectId(projectId);
//         console.log("Successfully fetched project data");
//         console.log("studentsIds", students_ids, project_name, creator);

//         const mentor_query = `SELECT mentor_id FROM mentor_projects WHERE project_id = $1`

//         const mentorValue = [projectId]

//         const mentorResult = await queryDatabase(mentor_query, mentorValue)
// console.log("mentor result", mentorResult)
// let mentorIdArray = [];
//         let a = mentorIdArray.push(mentorResult[0].mentor_id)
// console.log("mentor id ", mentorIdArray)
//         const createdNotifications = [];
//         const io = req.app.get('io'); // Get io instance

//         let onlineCount = 0;
//         let offlineCount = 0;
//         //  user_id, type, content, created_by, is_read, studentsData, mentorData, url
//         for (let i = 0; i < students_ids.length; i++) {
//             let content = creator.role === 'mentor' ? `Project ${project_name} is created and assigned to you.` : `Project ${project_name} has been created and is pending for approval.`
//             const notificationData = await createNotification(
//                 students_ids[i],
//                 "Project created",
//                 content,
//                 creator.id,
//                 false,
//                 [],
//                 mentorIdArray,
//                 `/projects/${projectId}`
//             );

//             createdNotifications.push(notificationData);

//             // Emit real-time notification
//             const notificationPayload = {
//                 id: notificationData.id,
//                 type: notificationData.type,
//                 content: notificationData.content,
//                 created_by: notificationData.created_by,
//                 created_at: notificationData.created_at,
//                 url: notificationData.url,
//                 is_read: notificationData.is_read,
//                 creator_name: creator.name // Add creator name if available
//             };

//             const wasSentRealtime = emitNotificationToUser(io, students_ids[i], notificationPayload);
//             if (wasSentRealtime) {
//                 onlineCount++;
//             } else {
//                 offlineCount++;
//             }
//         }

//         res.json({ 
//             success: true,
//             message: "Notifications created successfully",
//             notifications: createdNotifications,
//             studentIds: students_ids,
//             stats: {
//                 total: students_ids.length,
//                 sentRealtime: onlineCount,
//                 storedForOffline: offlineCount
//             }
//         });

//     } catch (error) {
//         console.error("Error creating notifications:", error);
//         res.status(500).json({ 
//             success: false,
//             error: "Failed to create notifications",
//             details: error.message 
//         });
//     }
// });

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const authMiddleware = require('../../../middleware/auth');
// const { getStudentIdsByProjectId } = require('./helpers/getStudentsIds')
// const createNotification  = require('./helpers/createNotHelper')
// router.use(authMiddleware);

// router.post('/', async (req, res) => {
//     console.log("yes creating notification for project status")

//     const { id: projectId } = req.body;

//     try {
//         const { students_ids,  project_name, creator} = await getStudentIdsByProjectId(projectId);
//         console.log("yes successfully")
//         console.log("studentsIds",students_ids, project_name)

//         for(let i = 0; i < students_ids.length; i++) {
//             createNotification( students_ids[i], "Project created", `Project ${project_name} is created and assigned to you.`,
//                 creator.id, false, [], [], `/projects/${projectId}`
//             )
//         }   
//         res.json({ studentIds });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to fetch student IDs" });
//     }
// });

// module.exports = router;