// Create new route: /student-request-status
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    const student_id = req.user?.userId;

    try {
        // Check for any pending request
        const pendingRequest = await queryDatabase(`
            SELECT 
                sgr.*,
                sg.title as group_name,
                sg.mentor_id
            FROM student_group_requests sgr
            JOIN student_groups sg ON sgr.group_id = sg.id
            WHERE sgr.student_id = $1 AND sgr.status = 'pending'
            ORDER BY sgr.requested_at DESC 
            LIMIT 1
        `, [student_id]);

        if (pendingRequest.length === 0) {
            return res.json({ status: null });
        }

        const request = pendingRequest[0];
        const now = new Date();
        const requestTime = new Date(request.requested_at);
        const timeDifference = now - requestTime;
        const cooldownPeriod = 30 * 60 * 1000; // 30 minutes

        // Check if request has expired (30 minutes passed)
        if (timeDifference >= cooldownPeriod) {
            // Update request status to expired and delete notification
            await queryDatabase(`
                UPDATE student_group_requests 
                SET status = 'expired' 
                WHERE id = $1
            `, [request.id]);

            // Delete related notification
            await queryDatabase(`
                DELETE FROM notifications 
                WHERE created_by = $1 
                AND recipient_id = $2 
                AND type = 'group_invite'
                AND created_at >= $3
            `, [student_id, request.mentor_id, request.requested_at]);

            return res.json({ 
                status: 'expired',
                message: 'Your request has expired. The mentor didn\'t respond within 30 minutes.'
            });
        }

        return res.json({ 
            status: 'pending',
            requestTime: request.requested_at,
            groupName: request.group_name
        });

    } catch (error) {
        console.error("Error checking request status:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;