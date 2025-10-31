const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
//router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {

    const student_id = req.user.id

    try {
        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM student_group_members
                WHERE student_id = $1
            ) AS has_group;
        `;
        const values = [student_id];
        const result = await queryDatabase(query, values);
        return res.json({
            message: 'fetched',
            group: result[0].has_group 
        });
    } catch (error) {
    console.error('Error during group check:', error); 
    res.status(401).json({ error: 'Invalid user' });
}

});

module.exports = router;
