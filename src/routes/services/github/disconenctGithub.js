const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

router.delete('/', async (req, res) => {
    console.log("deleting github user")
    try {
        const userId = req.user.id
        if (!userId) {
           console.log('User ID is missing in the request');
            return res.status(400).json({ error: 'User ID is required' });
        }

        const result = await queryDatabase(
            'DELETE FROM github_users WHERE user_id = $1',
            [userId]
        );

        console.log(`GitHub connection found for user ID: ${userId} and successfully deleted`);
        return res.status(200);
    } catch (error) {
       console.log('Error fetching GitHub user info:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;