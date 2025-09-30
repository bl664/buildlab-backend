const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

//router.use(authMiddleware);

router.get('/', async (req, res) => {
    const student_id = req.user.id;

    try {
        const lastRequest = await queryDatabase(`
            SELECT requested_at FROM student_group_requests 
            WHERE student_id = $1 
            ORDER BY requested_at DESC 
            LIMIT 1
        `, [student_id]);

        if (lastRequest.length === 0) {
            return res.json({ lastRequestTime: null });
        }

        return res.json({ 
            lastRequestTime: lastRequest[0].requested_at 
        });
    } catch (error) {
        console.error("Error fetching last request time:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;