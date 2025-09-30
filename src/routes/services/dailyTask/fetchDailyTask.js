const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("Fetching daily tasks");
     
    const user_id = req.user.id

    if(!user_id) {
        console.log("Your session has expired. Please Login again.")
        res.status(401).json({ error: 'Your session has expired. Please Login again.' });
    }

    try {
        const query = `
            SELECT id, title, status, created_at
            FROM daily_tasks
            WHERE user_id = $1
            ORDER BY created_at DESC;
        `;
        const values = [user_id];

        const tasks = await queryDatabase(query, values);

        if (!tasks || tasks.length === 0) {
            console.log("No daily tasks found for user", { user_id });
            return res.status(200).json([]);
        }

        console.log("Daily tasks fetched successfully", { user_id });
        res.status(200).json(tasks);

    } catch (error) {
        console.log("Error fetching daily tasks", { error });
        res.status(500).json({ error: 'Error fetching daily tasks' });
    }
}
);

module.exports = router;