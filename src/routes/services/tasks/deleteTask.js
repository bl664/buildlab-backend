const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const jwt = require('jsonwebtoken');

router.use(authMiddleware);

router.delete('/', async (req, res) => {
    console.log("yes deleting task");
    const { id } = req.body;
    try {
        let newReq = JSON.stringify(req.user, null, 2);
        console.log("req is", newReq);

        newReq = JSON.parse(newReq);
        const user_id = newReq.userId;

        if (!id) {
            return res.status(400).json({ error: 'Invalid ID' });
        }

        const query = `DELETE from tasks WHERE id = $1`;
        const values = [id];

        const result = await queryDatabase(query, values);

        console.log("Deleted task:", result);
        return res.json({
            message: 'task deleted successfully',
            task: result
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        logger.warn('Invalid user', { id });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
