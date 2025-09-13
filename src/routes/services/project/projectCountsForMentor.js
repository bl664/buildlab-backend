const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting project counts")
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);

    let user_id = decoded.userId
    console.log("user_id", user_id, req.query)

    try {
        const query = `
            SELECT 
                COUNT(mp.project_id) AS "totalProjects",
                COUNT(CASE WHEN p.status = 'completed' THEN 1 END) AS "completedProjects",
                COUNT(CASE WHEN p.status = 'active' THEN 1 END) AS "activeProjects"
            FROM mentor_projects mp
            LEFT JOIN projects p ON mp.project_id = p.id
            WHERE mp.mentor_id = $1;
        `;
        const values = [user_id];

        const result = await queryDatabase(query, values);
        const statusCounts = result[0]; // <- assuming pg client
        console.log("statusCounts are", statusCounts)
        return res.json({
            message: 'fetched',
            statusCounts
        })
    } catch (error) {
        logger.warn('Invalid user', { user_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router;
