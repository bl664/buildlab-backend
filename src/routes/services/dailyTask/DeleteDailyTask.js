const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

router.delete('/', async (req, res) => {
    console.log("Deleting daily task");

    const user_id = req.user.id

    if(!user_id) {
        console.log("Your session has expired. Please Login again.")
        res.status(401).json({ error: 'Your session has expired. Please Login again.' });
    }

    try {
        const { id } = req.query;
        
        const taskId = parseInt(id, 10);
        if (!taskId || isNaN(taskId)) {
            return res.status(400).json({ error: 'Invalid or missing task ID' });
        }

        const checkQuery = `
        SELECT id, user_id 
        FROM daily_tasks 
        WHERE id = $1;
        `;

        const checkResult = await queryDatabase(checkQuery, [taskId]);

        if (!checkResult || checkResult.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (checkResult[0].user_id !== user_id) {
            return res.status(403).json({ error: 'You are not authorized to delete this task' });
        }

        console.log("Deleting daily task with id:", id);

        const query = `
            DELETE FROM daily_tasks
            WHERE id = $1 AND user_id = $2;
        `;
        const values = [taskId, user_id];

        const result = await queryDatabase(query, values);

        console.log("Daily task deleted successfully", { id });
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error("Error deleting daily task", { error: error.message });
        res.status(500).json({ error: 'Error deleting daily task' });
    }
}
);

module.exports = router;