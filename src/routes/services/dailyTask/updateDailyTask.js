const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

router.put('/', async (req, res) => {
    console.log("Updating daily task");

    const user_id = req.user.id

    if (!user_id) {
        console.log("Your session has expired. Please Login again.")
        res.status(401).json({ error: 'Your session has expired. Please Login again.' });
    }

    

    try {
        const { taskId, updateStatus } = req.body

        if (!taskId) {
            return res.status(400).json({ error: 'Invalid task ID' });
        }
        if (!updateStatus || typeof updateStatus !== 'string') {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const query = `
            UPDATE daily_tasks
            SET status = $1
            WHERE id = $2 AND user_id = $3
            ReTURNING id;
        `;
        const values = [updateStatus, taskId, user_id];

        const result = await queryDatabase(query, values);

        if (!result || result.length === 0) {
            console.warn("Task not found or unauthorized update attempt", { taskId, user_id });
            return res.status(404).json({ error: 'Task not found or you do not have permission to update it' });
        }
        const resultId = result[0]?.id;

        res.status(200).json({ message: 'Daily task updated successfully', id: resultId });

    } catch (error) {
        console.error("Error updating daily task", { error: error.message });
        res.status(500).json({ error: 'Error updating daily task' });
    }
}
);

module.exports = router;