const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("yes getting Teams count for mentor");
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;
    console.log("mentorid", user_id);

    try {
        const query = `
          SELECT COUNT(*) AS total_teams
          FROM teams
          WHERE mentor_id = $1
        `;

        const values = [user_id];
        const result = await queryDatabase(query, values);

        console.log("Total teams count is", result);

        return res.json({
            message: 'fetched',
            teams: result[0]   // since COUNT returns one row
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid user' });
    }
});

module.exports = router;
