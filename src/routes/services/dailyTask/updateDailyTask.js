const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);     

router.put('/', async (req, res) => {
    console.log("Updating daily task");

    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;

    try {
        console.log("req.body is", req.body);
        const { taskId, updateStatus } = req.body
console.log("Updating daily task with taskId:", taskId, "and status:", updateStatus);

        const query = `
            UPDATE daily_tasks
            SET status = $1
            WHERE id = $2 AND user_id = $3
            ReTURNING id;
        `;
        const values = [ updateStatus, taskId , user_id];

        const result = await queryDatabase(query, values);
console.log("Update result is", result);
       const resultId = result[0]?.id;

        console.log("Daily task updated successfully", { taskId });
        res.status(200).json({ message: 'Daily task updated successfully', id: resultId });

    } catch (error) {
        logger.error("Error updating daily task", { error });
        res.status(500).json({ error: 'Error updating daily task' });
    }
}
);

module.exports = router;