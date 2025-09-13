const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.get('/', async (req, res) => {
console.log("getallstudents")
    try {
        const query = 'SELECT * FROM users WHERE role = $1';
        const values = ['student'];

        const result = await queryDatabase(query, values);
        const user = result;

        return res.json({
            message: 'fetched',
            result: user
        })
    }
    catch {
        logger.warn('Invalid user', { user_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router;