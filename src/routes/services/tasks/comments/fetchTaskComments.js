
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../../services/dbQuery');


router.get('/', async (req, res) => {
    console.log("yes fetch task comments")
    const user_id = req.user.id;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const { id } = req.query;
     if (!id) {
        return res.status(400).json({ error: 'Invalid Task' });
    }

 let client;
    try {
        client = await getTransactionClient();
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

        const commentResult = await queryDatabase(query, values, client);
        await commitTransaction(client);
        return res.json({
            message: 'fetched',
            comments: commentResult
        })
    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error('Error Fetching task comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

module.exports = router

