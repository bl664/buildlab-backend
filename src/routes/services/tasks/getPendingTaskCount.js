
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');


router.get('/', async (req, res) => {
    console.log("yes getting pending Tasks")
    const mentor_id = req.user.id
    if (!mentor_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
let client;
    try {
          
                  client = await getTransactionClient();
        const query = `
            SELECT 
            COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) AS pending_tasks,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks
            FROM tasks
            WHERE created_by = $1;
        `;

        const values = [mentor_id];

        const result = await queryDatabase(query, values, client);
         await commitTransaction(client);
        const tasksCount = result;
        console.log("pending tasks are", tasksCount)
        return res.json({
            message: 'fetched',
            count: tasksCount
        })
    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error('Error fetching pending tasks count for mentor', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

module.exports = router

