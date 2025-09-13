const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);     

router.post('/', async (req, res) => {
    console.log("Creating daily task");

    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;

    console.log("req.body is", req.body);
    try {
        const { title, status } = req.body;
console.log("title is", title, status);
        const query = `
            INSERT INTO daily_tasks (title, status, user_id)
            VALUES ($1, $2, $3) RETURNING id, title, status, created_at;
        `;
        const values = [title, status, user_id];

        const taskResult = await queryDatabase(query, values);
        const taskId = taskResult[0].id;      
        const task = taskResult[0]
        logger.info("Daily task created successfully", { taskId }); 

        res.status(201).json({ message: 'Daily task created successfully', task });

    } catch (error) {
        logger.error("Error creating daily task", { error });
        res.status(500).json({ error: 'Error creating daily task' });
    }
}

);

module.exports = router;