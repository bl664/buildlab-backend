const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("ye active project count")
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);

    let user_id = decoded.userId
    console.log("user_id", user_id)
    try {
        const query = `
        SELECT 
        p.status, 
        COUNT(*) AS count
        FROM projects p
        JOIN student_projects sp ON p.id = sp.project_id
        WHERE sp.student_id = $1
        GROUP BY p.status;
        `;
        const values = [user_id];

        const result = await queryDatabase(query, values);
        const statusCounts = result;
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

module.exports = router

