
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    const { id } = req.query;
console.log("trying to fetch group by id", id)

    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
        console.log("invalid group id format")
        return res.status(400).json({ error: 'Invalid group ID format' });
    }

    try {
       const query = `

        `;


        const result = await queryDatabase(query, [id]);

        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }
console.log("fetched team by id is", result)
        return res.json({
            message: 'Fetched successfully',
            result: result
        });
    } catch (error) {
        logger.error('Failed to fetch team by ID', { error });
        return res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router

