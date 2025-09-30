const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

//router.use(authMiddleware);

router.post('/', async (req, res) => {
  console.log("Creating task...");

  const user_id = req.user.id
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
    res.status(500).json({ error: 'Error creating task' });
  }
});

module.exports = router;
