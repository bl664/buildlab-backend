
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting pending Tasks")
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const mentor_id = newReq.userId;
    console.log("mentorid", mentor_id)
    try {
        const query = `
            SELECT 
            COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) AS pending_tasks,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks
            FROM tasks
            WHERE created_by = $1;
        `;

        const values = [mentor_id];

        const result = await queryDatabase(query, values);
        const tasksCount = result;
        console.log("pending tasks are", tasksCount)
        return res.json({
            message: 'fetched',
            count: tasksCount
        })
    } catch (error) {
        logger.warn('Invalid user', { mentor_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

