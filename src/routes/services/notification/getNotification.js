const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("getting notification")
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;

    try {
    // const { user_id } = req.body;
        const query = `
           SELECT * FROM notifications WHERE created_for_id = $1 ORDER BY created_at DESC;
        `;
        const values = [user_id];
        const notifications = await queryDatabase(query, values);
        res.status(201).json({ message: 'notification created successfully', notifications });
    } catch(error) {
        await queryDatabase('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error creating notification' });
    }
});

module.exports = router;