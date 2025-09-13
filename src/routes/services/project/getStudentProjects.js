
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getStudentProjectDetail")
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);

    let user_id = decoded.userId
    try {
        const query = `
        SELECT 
            p.id,
            p.name,
            p.description,
            p.status,
            p.end_date,
            (
        SELECT COUNT(*)
        FROM student_projects sp2
        WHERE sp2.project_id = p.id
    ) AS assignee
        FROM 
            projects p
        JOIN 
            student_projects sp
        ON 
            p.id = sp.project_id
        WHERE 
            sp.student_id = $1;
        `;
        const values = [user_id];

        const result = await queryDatabase(query, values);
        const projects = result;
        console.log("student projects ", projects)
        return res.json({
            message: 'fetched',
            projects: projects
        })
    } catch(error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router


            // p.start_date,
            // p.end_date,
            // p.created_by_id,
            // p.createdat,
            // p.updatedat