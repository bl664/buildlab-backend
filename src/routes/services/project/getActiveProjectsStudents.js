const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {

    let user_id = req.user.id
if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    let client;
    try {
        client = await getTransactionClient();

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

        const result = await queryDatabase(query, values, client);
        await client.query('COMMIT');
        const activeProjects = result; // assuming pg client

        console.log("activeProjects are", activeProjects);
        return res.json({
            message: 'fetched',
            activeProjects
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error fetching student active projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
