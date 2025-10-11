
const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    const { id } = req.query;
    console.log("trying to fetch group members", id)

    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
        console.log("invalid group id format")
        return res.status(400).json({ error: 'Invalid group ID format' });
    }
    try {
       const query = `
            SELECT 
                mu.user_id AS student_id,
                mu.name,
                mu.email,
                mu.role,
                mu.created_at
            FROM student_group_members sgm
            JOIN messaging_users mu 
            ON mu.user_id = sgm.student_id
            WHERE sgm.group_id = $1;
        `;
        const result = await queryDatabase(query, [id]);

        // if (!result || result.length === 0) {
        //     return res.status(404).json({ error: 'Group not found' });
        // }

        console.log("fetched group by id is", result)
        
        return res.json({
            message: 'Fetched successfully',
            members: result
        });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router

