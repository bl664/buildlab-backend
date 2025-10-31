const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
//router.use(authMiddleware);

router.get('/', async (req, res) => {

    try {
        const query = 'SELECT * FROM users WHERE role = $1';
        const values = ['mentor'];

        const result = await queryDatabase(query, values);
        const user = result;

        return res.json({
            message: 'fetched',
            result: user
        })
    }
    catch {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router;