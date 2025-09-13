const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.delete('/', async (req, res) => {
    console.log("Deleting daily task");

    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;

    try {
        const { id } = req.query;

        console.log("Deleting daily task with id:", id);

        const query = `
            DELETE FROM daily_tasks
            WHERE id = $1 AND user_id = $2;
        `;
        const values = [id, user_id];

        const result = await queryDatabase(query, values);
console.log("Delete result is", result);
        // if (result.length === 0) {
        //     console.log("No daily task found to delete", { id });
        //     return res.status(404).json({ error: 'Daily task not found' });
        // }

        console.log("Daily task deleted successfully", { id });
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        logger.error("Error deleting daily task", { error });
        res.status(500).json({ error: 'Error deleting daily task' });
    }
}
);

module.exports = router;