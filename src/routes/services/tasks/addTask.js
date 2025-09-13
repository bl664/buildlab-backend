const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  console.log("Creating task...");

  const user = JSON.parse(JSON.stringify(req.user));
  const user_id = user.userId;
  const io = req.app.get('io');


  const {
    title,
    description,
    status,
    assignedMember,
    dueDate,
    priority,
    project_id,
    mentor_id: bodyMentorId
  } = req.body.taskData;

  const mentor_id = bodyMentorId || user_id;

  let client;

  try {
    client = await getTransactionClient();

    // Insert task
    const taskInsertQuery = `
      INSERT INTO tasks (title, description, status, due_date, priority, created_by, project_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const taskValues = [title, description, status, dueDate, priority, user_id, project_id];
    const taskResult = await queryDatabase(taskInsertQuery, taskValues, client);
    const taskId = taskResult[0].id;

    // Insert mentor task link
    const mentorTaskInsertQuery = `
      INSERT INTO mentor_tasks (mentor_id, task_id)
      VALUES ($1, $2);
    `;
    await queryDatabase(mentorTaskInsertQuery, [mentor_id, taskId], client);

    // Insert student assignments
    const studentTaskInsertQuery = `
      INSERT INTO student_tasks (student_id, task_id)
      VALUES ($1, $2);
    `;
    for (const studentId of assignedMember) {
      await queryDatabase(studentTaskInsertQuery, [studentId, taskId], client);
    }

    if(bodyMentorId) {
      let mentor_id = bodyMentorId;
      console.log("Sending notification to ", mentor_id)

      await sendAndStoreNotification(io, mentor_id, {
        type: 'New Task',
        content: `New Task - "${title}" created.`,
        createdBy: user_id,
        url: '/'
      });
    }

    const sendNotification = assignedMember.map(async (studentId) => {
      console.log("Sending notification to ", studentId)
      await sendAndStoreNotification(io, studentId, {
        type: 'New Task',
        content: `New Task "${title}" created.`,
        createdBy: user_id,
        url: '/'
      });
    })
    await client.query('COMMIT');
    client.release();
    res.status(201).json({
      message: 'Task created successfully',
      taskResult: taskResult[0]
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    logger.error('Error creating task', { error });
    res.status(500).json({ error: 'Error creating task' });
  }
});

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const authMiddleware = require('../../../middleware/auth');
// const logger = require('../../../utils/logger');
// const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
// router.use(authMiddleware);     

// router.post('/', async (req, res) => {
//   console.log("Creating task...");

//     const { user_id } = req.query;
//     console.log("mentorid", user_id)
//     try {
//         const { title, description, status, assignedMember, dueDate, priority, project_id, mentor_id: bodyMentorId } = req.body.taskData;
//         const mentor_id = req.body.taskData?.mentor_id || user_id;

//         console.log("req,body", req.body.taskData)
//         const query = `
//             INSERT INTO tasks (title, description, status, due_date, priority, created_by, project_id)
//             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
//         `;
//         const values = [title, description, status, dueDate, priority, user_id, project_id];

//         const taskResult = await queryDatabase(query, values);
// console.log("taskResult", taskResult)
//         const taskId = taskResult[0].id;

//         const mentorTaskInsertQuery = `INSERT INTO mentor_tasks (mentor_id, task_id) 
//         VALUES ($1, $2)`

//         const mentorTaskInsertValue = [mentor_id, taskId]

//         const mentorTaskInsertResult = await queryDatabase(mentorTaskInsertQuery, mentorTaskInsertValue)

//         const studentTaskInsertQuery = `
//             INSERT INTO student_tasks (student_id, task_id)
//             VALUES ($1, $2);
//         `;

//         for (const studentId of assignedMember) {
//             await queryDatabase(studentTaskInsertQuery, [studentId, taskId]);
//         }
//         console.log("Task created successfully")
//         res.status(201).json({ message: 'Task created successfully', taskResult: taskResult[0] });

//     } catch(error) {
//         await queryDatabase('ROLLBACK'); // Roll back in case of an error
//         console.error(error);
//         res.status(500).json({ error: 'Error creating tak' });
//     }
// });
// module.exports = router;