
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../../middleware/auth');
const logger = require('../../../../utils/logger');
const { queryDatabase } = require('../../../../services/dbQuery');
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("yes fetch task comments")
    const { id } = req.query;

    try {
        console.log("id is ", id, req.query.id)
        const query = `
SELECT 
    c.id AS id,
    c.task_id,
    c.content AS content,
    c.created_at AS created_at,
    c.author_id AS author_id,
    mu.name AS author_name,

    pc.id AS parent_comment_id,
    pc.task_id AS parent_task_id,
    pc.content AS parent_content,
    pc.created_at AS parent_created_at,
    mu_parent.name AS parent_author_name

FROM task_comments c
JOIN messaging_users mu ON c.author_id = mu.user_id

LEFT JOIN task_comments pc ON c.parent_comment_id = pc.id
LEFT JOIN messaging_users mu_parent ON pc.author_id = mu_parent.user_id

WHERE c.task_id = $1
ORDER BY c.created_at ASC;


        `;
        const values = [id];

        const commentResult = await queryDatabase(query, values);
        console.log("task comments are",commentResult[0])
        return res.json({
            message: 'fetched',
            comments: commentResult
        })
    } catch (error) {
        logger.warn('Invalid user', { id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

