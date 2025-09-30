const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');


router.get('/', async (req, res) => {
    console.log("yes get Tasks count...")

    const student_id = req.user.id
     if (!student_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    let client;

    try {
        client = await getTransactionClient();
        const query = `SELECT 
        t.status,
        COUNT(*) AS count
        FROM tasks t
        JOIN student_tasks st ON t.id = st.task_id
        WHERE st.student_id = $1
        GROUP BY t.status;
        `;
        const values = [student_id];

        const result = await queryDatabase(query, values, client);
        await commitTransaction(client);
        const tasks = result;
        return res.json({
            message: 'fetched',
            result: tasks
        })
    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error('Error Fetching task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

module.exports = router

