
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("yes getBasicProjectDetail")

    let user_id = req.user.id
    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
let client;
    try {
        const query = `
            SELECT DISTINCT p.*
            FROM projects p
            LEFT JOIN mentor_projects mp ON mp.project_id = p.id
            WHERE p.created_by_id = $1 OR mp.mentor_id = $1
        `;
        const values = [user_id];

        client = await getTransactionClient();

        const result = await queryDatabase(query, values, client);
        const projects = result;

        await client.query('COMMIT');
        client.release();

        return res.json({
            message: 'fetched',
            projects: projects
        })
    } catch(error) {
        await client.query('ROLLBACK'); 
        client.release();
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

/* SELECT * 
  FROM projects 
  WHERE id IN (
      SELECT project_id 
      FROM mentor_projects 
      WHERE mentor_id = $1
  ); */