// Create routes for mentor to approve/reject requests
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);
router.post('/reject', async (req, res) => {
    const mentor_id = req.user?.userId;
    const io = req.app.get('io');
    const { request_id } = req.body;

    try {
        // Get request details
        const requestDetails = await queryDatabase(`
            SELECT 
                sgr.*,
                sg.title as group_name
            FROM student_group_requests sgr
            JOIN student_groups sg ON sgr.group_id = sg.id
            WHERE sgr.id = $1 AND sg.mentor_id = $2 AND sgr.status = 'pending'
        `, [request_id, mentor_id]);

        if (!requestDetails.length) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        const request = requestDetails[0];

        // Start transaction
        await queryDatabase('BEGIN');

        try {
            // Update request status
            await queryDatabase(`
                UPDATE student_group_requests 
                SET status = 'rejected', responded_at = NOW()
                WHERE id = $1
            `, [request_id]);

            // Delete the original notification
            await queryDatabase(`
                DELETE FROM notifications 
                WHERE created_by = $1 
                AND recipient_id = $2 
                AND type = 'group_invite'
                AND created_at >= $3
            `, [request.student_id, mentor_id, request.requested_at]);

            // Send rejection notification to student
            await sendAndStoreNotification(io, request.student_id, {
                type: 'group_request_rejected',
                content: `Your request to join "${request.group_name}" was not approved. You can try joining other groups.`,
                createdBy: mentor_id,
                url: '/groups'
            });

            await queryDatabase('COMMIT');

            res.json({ message: 'Request rejected successfully' });
        } catch (error) {
            await queryDatabase('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error("Error rejecting request:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
