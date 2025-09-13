const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("Fetching daily tasks");

    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;

    try {
        const query = `
            SELECT id, title, status, created_at
            FROM daily_tasks
            WHERE user_id = $1
            ORDER BY created_at DESC;
        `;
        const values = [user_id];

        const tasks = await queryDatabase(query, values);

        if (tasks.length === 0) {
            console.log("No daily tasks found for user", { user_id });
            // return res.status(404).json({ message: 'No daily tasks found' });
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