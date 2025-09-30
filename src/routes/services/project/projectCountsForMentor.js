const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("yes getting project counts")

    let user_id = req.user.id

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    let client;
    try {
        client = await getTransactionClient();
;
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

        const result = await queryDatabase(query, values, client);

         await client.query('COMMIT');

        const statusCounts = result[0]; // <- assuming pg client
        console.log("statusCounts are", statusCounts)
        return res.json({
            message: 'fetched',
            statusCounts
        })
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error fetching student projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }
})

module.exports = router;
