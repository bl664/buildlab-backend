const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../../utils/notificationService');

router.post('/', async (req, res) => {
    console.log("yes creating task comment");

    const newReq = JSON.parse(JSON.stringify(req.user));
    const user_id = req.user.id
     if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const io = req.app.get('io');

    try {
        const { id, comment, parent_comment_id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Invalid Task' });
        }
client = await getTransactionClient();

const accessCheckQuery = `
            SELECT 1
            FROM tasks t
            WHERE t.id = $1 AND t.created_by = $2
            UNION
            SELECT 1
            FROM student_tasks st
            WHERE st.task_id = $1 AND st.student_id = $2
            LIMIT 1;
        `;
        const accessCheck = await queryDatabase(accessCheckQuery, [id, user_id], client);

        if (accessCheck.length === 0) {
            await rollbackTransaction(client);
            return res.status(403).json({ error: 'Unauthorized: You cannot comment on this task' });
        }


        // Convert empty string or undefined to null
        const safeParentCommentId = parent_comment_id && parent_comment_id !== '' ? parent_comment_id : null;

        const query = `
            INSERT INTO task_comments (
                task_id,
                author_id,
                content,
                parent_comment_id
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const values = [id, user_id, comment, safeParentCommentId];
        const CommentResult = await queryDatabase(query, values, client);

        const fetchStudentsDetails = `
                SELECT 
            t.title AS task_title,
            COALESCE(
                json_agg(st.student_id) FILTER (WHERE st.student_id IS NOT NULL),
                '[]'
            ) AS student_ids
            FROM tasks t
            LEFT JOIN student_tasks st ON st.task_id = t.id
            WHERE t.id = $1
            GROUP BY t.id;
            `

        const studentsAndTaskResult = await queryDatabase(fetchStudentsDetails, [id], client)
        await commitTransaction(client);

         const sendNotification = studentsAndTaskResult[0].student_ids.map(async (studentId) => {
      await sendAndStoreNotification(io, studentId, {
                type: 'Task Comment',
                content: `New Comment created for task ${studentsAndTaskResult[0].task_title}.`,
                createdBy: user_id,
                url: '/'
            });
    })

        res.status(200).json({
            message: 'Comment created successfully',
            comment: CommentResult[0],
        });

    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error(error);
        res.status(500).json({ error: 'Error creating task comment' });
    }

});

module.exports = router;
