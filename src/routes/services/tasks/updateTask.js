const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);

router.put('/', async (req, res) => {
    console.log("yes update task");

    const newReq = JSON.parse(JSON.stringify(req.user));
    const user_id = newReq.userId;
      const io = req.app.get('io');

    try {
        const { id } = req.body;
        console.log("req.body", req.body)
        
        const { title, description, status, assigned_to, due_date, priority, created_by } = req.body.updatedTask;
        
        // 1. Update task details
        const query = `UPDATE tasks SET 
            title = $1,
            description = $2,
            status = $3,
            due_date = $4,
            priority = $5,
            updated_at = $6
            WHERE id = $7
            RETURNING *;`;

        const values = [title, description, status, due_date, priority, new Date(), id];
        const taskResult = await queryDatabase(query, values);

        await queryDatabase('DELETE FROM student_tasks WHERE task_id = $1;', [id]);

        for (const member of assigned_to) {
            await queryDatabase(
                'INSERT INTO student_tasks (task_id, student_id) VALUES ($1, $2);',
                [id, member.student_id || member]
            );
        }

        const fullTaskQuery = `
            SELECT 
                t.*, 
                (
                    SELECT json_agg(
                        json_build_object(
                            'student_id', mu.user_id, 
                            'student_name', mu.name
                        )
                    )
                    FROM student_tasks st
                    JOIN messaging_users mu ON mu.user_id = st.student_id
                    WHERE st.task_id = t.id
                ) AS assigned_to
            FROM tasks t
            WHERE t.id = $1;

            `;

        const fullTaskResult = await queryDatabase(fullTaskQuery, [id]);

const sendNotification = assigned_to.map(async (student) => {
      console.log("Sending notification to ", student.student_id)
      await sendAndStoreNotification(io, student.student_id, {
                type: 'Task Updated',
                content: `Task ${title} has been updated`, 
                createdBy: user_id,
                url: '/'
            });
    })

        res.status(200).json({
            message: 'Task updated successfully',
            updatedTask: fullTaskResult[0],
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating task' });
    }
});

module.exports = router;