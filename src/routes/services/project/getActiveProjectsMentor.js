const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
//router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("Fetching active projects for mentor");

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
                p.id AS "id",
                p.name,
                p.created_at,
                p.status,
                p.end_date
            FROM mentor_projects mp
            JOIN projects p ON mp.project_id = p.id
            WHERE mp.mentor_id = $1
              AND p.status = 'active';
        `;
        const values = [user_id];

        const result = await queryDatabase(query, values, client);
        await client.query('COMMIT');
        const activeProjects = result;

        console.log("activeProjects are", activeProjects);
        return res.json({
            message: 'fetched',
            activeProjects
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error fetching student projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
