const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.put('/', async (req, res) => {
    console.log("yes update task");

    const user_id = req.user.id

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    const user_role = req.user.role;
    const io = req.app.get('io');

    let client;

    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Task ID is required' });
        }

        const { title, description, status, assigned_to, due_date, priority, created_by } = req.body.updatedTask;

        client = await getTransactionClient();
        await client.query('BEGIN');

        let checkQuery, checkValues;
        if (user_role === 'student') {
            checkQuery = `SELECT 1 FROM student_tasks WHERE task_id = $1 AND student_id = $2 LIMIT 1;`;
            checkValues = [id, user_id];
        } else if (user_role === 'mentor') {
            checkQuery = `SELECT 1 FROM mentor_tasks WHERE task_id = $1 AND mentor_id = $2 LIMIT 1;`;
            checkValues = [id, user_id];
        } else {
            return res.status(403).json({ error: 'Unauthorized role' });
        }

        const permissionCheck = await client.query(checkQuery, checkValues);
        
        if (permissionCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not authorized to update this task' });
        }


        // 1. Update task details
        const updateQuery = `
            UPDATE tasks SET 
                title = $1,
                description = $2,
                status = $3,
                due_date = $4,
                priority = $5,
                updated_at = $6
            WHERE id = $7
            RETURNING id;`;

        const updateValues = [title, description, status, due_date, priority, new Date(), id];
        const taskResult = await queryDatabase(updateQuery, updateValues, client);

        await queryDatabase('DELETE FROM student_tasks WHERE task_id = $1;', [id], client);

        for (const member of assigned_to) {
            await queryDatabase(
                'INSERT INTO student_tasks (task_id, student_id) VALUES ($1, $2);',
                [id, member.student_id || member], client
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

        const fullTaskResult = await queryDatabase(fullTaskQuery, [id], client);

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
        if (client) await client.query('ROLLBACK');
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Error updating task' });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;