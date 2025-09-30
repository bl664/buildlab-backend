const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../../services/dbQuery');

router.delete('/', async (req, res) => {
    console.log("yes deleting task comment");
            const user_id = req.user.id
 if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    const { id } = req.body;
     if (!id) {
        return res.status(400).json({ error: 'Invalid comment' });
    }
    let client;

    try {
        client = await getTransactionClient();

        const checkQuery = `SELECT author_id FROM task_comments WHERE id = $1`;
        const checkValues = [id];
        const checkResult = await queryDatabase(checkQuery, checkValues, client);

        if (checkResult.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const comment = checkResult[0];
        if (comment.author_id !== user_id) {
            return res.status(403).json({ error: 'You are not authorized to delete this comment' });
        }

        const query = `DELETE from task_comments WHERE id = $1`;
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
        console.error('Error deleting task comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
