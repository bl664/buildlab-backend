const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.put('/', async (req, res) => {
    console.log("updating notification")
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const user_id = newReq.userId;

    try {
        const { id } = req.body;
        console.log("id is ", id)
        const updateQuery = `
          UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *
        `;
        const updateValues = [id];
        const notifications = await queryDatabase(updateQuery, updateValues);

        // const { user_id, type, content, is_read, studentsData, mentorData, url } = req.body.notificationData;

        // const query = `
        //     INSERT INTO notifications (user_id, type, content, created_by, is_read, students_list, mentors_list, url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        // `;

        // const values = [user_id, type, content, created_by, is_read, studentsData, mentorData, url];
        // const notificationResult = await queryDatabase(query, values);
        res.status(201).json({ message: 'notification created successfully', notifications });
    } catch(error) {
        await queryDatabase('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error creating notification' });
    }
});
module.exports = router;

// UPDATE notifications SET is_read = TRUE WHERE id = 'b3411ed7-88bf-4fbf-8c66-4a5e61b9b7da';