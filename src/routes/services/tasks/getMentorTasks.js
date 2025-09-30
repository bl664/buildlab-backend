
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("yes get Tasks");

    const mentor_id = req.user.id
    if (!mentor_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    let client;
    try {

        client = await getTransactionClient();

        const query = `
        SELECT
            t.id,
            t.title,
            t.description,
            t.due_date,
            t.status,
            t.priority,
            (
                SELECT COUNT(*)
                FROM student_tasks st
                WHERE st.task_id = t.id
            ) AS assigned_student_count
        FROM tasks t
        WHERE t.id IN (
            SELECT task_id
            FROM mentor_tasks
            WHERE mentor_id = $1
        );
        `
        const values = [mentor_id];
        const result = await queryDatabase(query, values, client);

        await commitTransaction(client);

        // console.log("task result", result)
        return res.json({
            message: 'fetched',
            result: result
        });

    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error('Error Fetching tasks for mentor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router

