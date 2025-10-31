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
        p.status, 
        COUNT(*) AS count
        FROM projects p
        JOIN student_projects sp ON p.id = sp.project_id
        WHERE sp.student_id = $1
        GROUP BY p.status;
        `;
        const values = [user_id];

        const result = await queryDatabase(query, values, client);

        await client.query('COMMIT');

        const statusCounts = result;

        return res.json({
            message: 'fetched',
            statusCounts
        })
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error fetching projects counts', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }
})

module.exports = router

