const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

router.delete('/', async (req, res) => {
    console.log("yes deleting task");

    const user_id = req.user.id;
    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const { id } = req.body;
    if (!id) {
            return res.status(400).json({ error: 'Invalid Task' });
        }
    let client;

    try {
client = await getTransactionClient();

        const checkQuery = `SELECT 1 FROM tasks WHERE id = $1 AND created_by = $2 LIMIT 1;`;
        const checkResult = await queryDatabase(checkQuery, [id, user_id], client);

        if (checkResult.length === 0) {
            await rollbackTransaction(client);
            return res.status(403).json({ error: 'You are not authorized to delete this task' });
        }

        

        const query = `DELETE from tasks WHERE id = $1 RETURNING *;`;
        const values = [id];

        const result = await queryDatabase(query, values, client);

         await commitTransaction(client);
        console.log("Deleted task:", result);
        return res.json({
            message: 'task deleted successfully',
            task: result
        });
    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
