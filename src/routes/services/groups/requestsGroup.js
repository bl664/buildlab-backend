const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("yes fetching requests groups");

    const mentor_id = req.user?.userId;
    console.log("mentorid", mentor_id);

    try {
        const query = `
         SELECT 
    sgr.*, 
    sg.title, 
    sg.description, 
    sg.status AS group_status, 
    sg.created_at, 
    sg.max_members, 
    sg.tags,
    mu.name AS student_name
FROM student_group_requests sgr
INNER JOIN student_groups sg ON sgr.group_id = sg.id
LEFT JOIN messaging_users mu ON mu.user_id = sgr.student_id
WHERE sg.mentor_id = $1
ORDER BY sgr.requested_at DESC;

        `;

        const values = [mentor_id];
        const result = await queryDatabase(query, values);
        const student_groups = result;

        console.log("student_groups", student_groups);
        return res.json({
            message: 'fetched',
            groups: student_groups
        });
    } catch (error) {
        console.error("error fetching group requests", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
