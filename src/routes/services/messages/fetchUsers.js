const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("Getting chat contacts for user:", req.user.id);

    const user_id = req.user.id;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    try {
        const query = `
       SELECT DISTINCT
            u.user_id,
            u.name,
            u.email,
            u.role,
            u.is_online
        FROM messaging_users u
        INNER JOIN (
            SELECT 
                CASE
                    WHEN sender_id = $1 THEN receiver_id
                    ELSE sender_id
                END AS other_user_id
            FROM messages
            WHERE sender_id = $1 OR receiver_id = $1
        ) msg_users
        ON u.user_id = msg_users.other_user_id
        ORDER BY u.is_online DESC, u.name ASC;
        `;

        const result = await queryDatabase(query, [user_id]);

        return res.json({
            message: 'Chat contacts fetched successfully',
            contacts: result
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat contacts' });
    }
});


module.exports = router;