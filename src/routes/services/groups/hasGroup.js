const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting groups");
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const mentor_id = newReq.userId;
    console.log("mentorid", mentor_id);

    try {
        console.log("checking group...")
        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM student_groups
                WHERE mentor_id = $1
            ) AS has_group;
        `;
        const values = [mentor_id];
console.log("finalinzing result calling...")
        const result = await queryDatabase(query, values);
console.log("has groups ", result[0].has_group )
        return res.json({
            message: 'fetched',
            group: result[0].has_group 
        });
    } catch (error) {
    console.log('Invalid user in group', { mentor_id });
    console.error('Error during group check:', error); // <-- Add this
    res.status(401).json({ error: 'Invalid user' });
}

});

module.exports = router;
