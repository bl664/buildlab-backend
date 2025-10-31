const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.delete('/', async (req, res) => {
    
    const user_id = req.user.id;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    let client;

    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Please try again' });
        }

        client = await getTransactionClient();
        
         const accessCheckQuery = `
            SELECT 1
            FROM projects p
            WHERE p.id = $1
              AND (
                  p.created_by_id = $2
                  OR EXISTS (
                      SELECT 1
                      FROM mentor_projects mp
                      WHERE mp.project_id = p.id
                        AND mp.mentor_id = $2
                  )
              )
            LIMIT 1;
        `;

        const accessResult = await queryDatabase(accessCheckQuery, [id, user_id], client);

        if (accessResult.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(403).json({ error: 'Unauthorized: You cannot delete this project' });
        }


        const query = `DELETE from projects WHERE id = $1 RETURNING *;`;
        const values = [id];
        
        const result = await queryDatabase(query, values, client);

        if (result.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: 'Project not found' });
        }

        await client.query('COMMIT');

        return res.json({
            message: 'Project deleted successfully',
            project: result
        });
    } catch (error) {
        console.error('Error deleting project:', error.message);
        if (client) await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
