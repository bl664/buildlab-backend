// Create routes for mentor to approve/reject requests
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

//router.use(authMiddleware);

router.post('/', async (req, res) => {
    const mentor_id = req.user.id;
    const io = req.app.get('io');
    const { request_id } = req.body;

    try {
        const requestDetails = await queryDatabase(`
            SELECT 
                sgr.*,
                sg.title as group_name,
                sg.max_members,
                COUNT(sgm.student_id) as current_members
            FROM student_group_requests sgr
            JOIN student_groups sg ON sgr.group_id = sg.id
            LEFT JOIN student_group_members sgm ON sg.id = sgm.group_id
            WHERE sgr.id = $1 AND sg.mentor_id = $2 AND sgr.status = 'pending'
            GROUP BY sgr.id, sg.id, sg.title, sg.max_members
        `, [request_id, mentor_id]);

        if (!requestDetails.length) {
            return res.status(404).json({ error: 'Request not found or unauthorized' });
        }

        const request = requestDetails[0];

        // Check if group is still not full
        if (request.current_members >= request.max_members) {
            return res.status(400).json({ error: 'Group is now full' });
        }

        // Start transaction
        await queryDatabase('BEGIN');

        try {
            // Update request status
            const result = await queryDatabase(`
                UPDATE student_group_requests 
                SET status = 'approved', responded_at = NOW()
                WHERE id = $1 
                RETURNING student_id
            `, [request_id]);

            const student_id = result.length > 0 ? result[0].student_id : null;

            // Add student to group
            await queryDatabase(`
                INSERT INTO student_group_members (group_id, student_id, joined_at)
                VALUES ($1, $2, NOW())
            `, [request.group_id, request.student_id]);

            await queryDatabase(`DELETE FROM student_group_requests where
                group_id = $1 AND status = 'pending' AND student_id = $2`, [request.group_id, student_id])

            // Delete the original notification
            await queryDatabase(`
                DELETE FROM notifications 
                WHERE created_by = $1 
                AND type = 'group_invite'
                AND created_at >= $2
            `, [request.student_id, request.requested_at]);

            // Send approval notification to student
            await sendAndStoreNotification(io, request.student_id, {
                type: 'group_request_approved',
                content: `Congratulations! Your request to join "${request.group_name}" has been approved.`,
                createdBy: mentor_id,
                url: '/'
            });

            await queryDatabase('COMMIT');

            res.json({ message: 'Request approved successfully' });
        } catch (error) {
            await queryDatabase('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error("Error approving request:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
