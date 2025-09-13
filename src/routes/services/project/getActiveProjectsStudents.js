const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("Fetching active projects for mentor");
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);

    let user_id = decoded.userId
    console.log("user_id", user_id);

    try {
        const query = `
            SELECT 
                p.id AS "id",
                p.name,
                p.created_at,
                p.status,
                p.end_date,
                p.start_date
            FROM student_projects sp
            JOIN projects p ON sp.project_id = p.id
            WHERE sp.student_id = $1
              AND p.status = 'active';
        `;
        const values = [user_id];

        const result = await queryDatabase(query, values);
        const activeProjects = result; // assuming pg client

        console.log("activeProjects are", activeProjects);
        return res.json({
            message: 'fetched',
            activeProjects
        });
    } catch (error) {
        logger.error('Error fetching active projects', { user_id, error });
        res.status(500).json({ error: 'Failed to fetch active projects' });
    }
});

module.exports = router;
