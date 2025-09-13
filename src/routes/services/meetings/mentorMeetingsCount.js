
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("getting mentor meetings count");

    const userId = req.user.userId;

    try {
        const query = `
            SELECT COUNT(*) AS count 
            FROM mentor_meetings 
            WHERE mentor_id = $1
        `;

        const params = [userId];

        const result = await queryDatabase(query, params);
console.log("count is ", parseInt(result[0].count, 10))
        return res.status(200).json({
            success: true,
            count: parseInt(result[0].count, 10), 
        });
    } catch (error) {
        console.error("Get meetings error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch meetings",
            details: error.message
        });
    }
});

module.exports = router;