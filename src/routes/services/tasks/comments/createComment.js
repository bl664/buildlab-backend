const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../../middleware/auth');
const { queryDatabase } = require('../../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../../utils/notificationService');
router.use(authMiddleware);

router.post('/', async (req, res) => {
    console.log("yes creating task comment");

    const newReq = JSON.parse(JSON.stringify(req.user));
    const user_id = newReq.userId;
const io = req.app.get('io');
    try {
        const { id, comment, parent_comment_id } = req.body;

        console.log("req.body comment", req.body);

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
        const CommentResult = await queryDatabase(query, values);

        console.log("creating comment", CommentResult);
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

        const studentsAndTaskResult = await queryDatabase(fetchStudentsDetails, [id])
console.log("studentsAndTaskResult", studentsAndTaskResult)
         const sendNotification = studentsAndTaskResult[0].student_ids.map(async (studentId) => {
      console.log("Sending notification to ", studentId)
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
        console.error(error);
        res.status(500).json({ error: 'Error creating task comment' });
    }
});

module.exports = router;
