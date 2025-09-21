const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
console.log("deleting...")
router.use(authMiddleware);

router.delete('/', async (req, res) => {
    console.log("deleting github user")
    try {
        let newReq = JSON.stringify(req.user, null, 2);
        console.log("req is", newReq);

        newReq = JSON.parse(newReq);
        const userId = newReq.userId;
console.log("user id is ", userId)
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