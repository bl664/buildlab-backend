const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

//router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("getting github user from DB")
    try {
        const userId = req.user.id;
// console.log("userId ", userId)
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const result = await queryDatabase(
            'SELECT github_user_name, avatar_url, html_url FROM github_users WHERE user_id = $1',
            [userId]
        );

        // console.log("github result is ", result)

        if (result.length === 0) {
            return res.status(400).json({ message: 'GitHub not connected' });
        }

        return res.status(200).json(result[0]);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
