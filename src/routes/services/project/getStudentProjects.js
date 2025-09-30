
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("yes getStudentProjectDetail")

    let user_id = req.user.id

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    let client;
    try {
        client = await getTransactionClient();
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

        const result = await queryDatabase(query, values, client);
        const projects = result;
        await client.query('COMMIT');

        console.log("student projects ", projects)
        return res.json({
            message: 'fetched',
            projects: projects
        })
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error fetching student projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }

})

module.exports = router