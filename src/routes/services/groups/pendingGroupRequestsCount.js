const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');

//router.use(authMiddleware);

router.get('/', async (req, res) => {

    const mentor_id = req.user.id;

    try {
        const query = `
            SELECT 
    g.id AS group_id,
    COUNT(r.id) AS requests_count
FROM student_groups g
LEFT JOIN student_group_requests r 
    ON g.id = r.group_id 
   AND r.status = 'pending'
WHERE g.mentor_id = $1
GROUP BY g.id;

        `;

        const values = [mentor_id];
        const result = await queryDatabase(query, values);


        return res.json({
            pendingRequestsCount: result   // each row = { group_id, requests_count }
        });
    } catch (error) {
        console.error("error fetching group requests", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;

//////////////just madde it correct and check it 
