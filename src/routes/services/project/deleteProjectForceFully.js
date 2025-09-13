const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const jwt = require('jsonwebtoken');
router.use(authMiddleware);

router.delete('/', async (req, res) => {
    console.log("yes deleting project forcefully");

    try {
        let newReq = JSON.stringify(req.user, null, 2);
        console.log("req is", newReq);

        newReq = JSON.parse(newReq);
        const user_id = newReq.userId;

        const { id, name } = req.body;
console.log("id is", id, name);
        if (!id) {
            return res.status(400).json({ error: 'Please try again' });
        }
        
        const query = `DELETE from projects wHERE id = $1`;
        const values = [id];
        
        const result = await queryDatabase(query, values);

        console.log("Deleted project:", result);
        return res.json({
            message: 'Project deleted successfully',
            project: result
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        queryDatabase('ROLLBACK');
        logger.warn('Invalid user', { user_id });
        res.status(500).json({ error: error });
    }
});

module.exports = router;
