
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting Teams for student")
    
    try {
        const { id } = req.query
        console.log("team id for student", id)
        const query = `
        SELECT student_id FROM student_teams WHERE team_id = $1;
        `;
        const values = [id];

        const result = await queryDatabase(query, values);
        const students = result;
console.log("students are", students)
        return res.json({
            message: 'fetched',
            result: students
        })
    } catch(error) {
        logger.warn('Invalid user', { id });
        res.status(401).json({ error: 'Invalid team id' });
    }
})

module.exports = router

