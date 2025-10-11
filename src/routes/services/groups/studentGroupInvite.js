// Updated student-group-invite route
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth')
const {
    queryDatabase,
    getTransactionClient,
    commitTransaction,
    rollbackTransaction
} = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

//router.use(authMiddleware);

router.post('/', async (req, res) => {
    console.log("Sending group invite with cooldown check");

    const student_id = req.user.id;
    const io = req.app.get('io');
    const { group_id } = req.body;
    const client = await getTransactionClient();
    try {
        // Check for cooldown period (30 minutes)
        const lastRequest = await queryDatabase(`
            SELECT requested_at FROM student_group_requests 
            WHERE student_id = $1 
            ORDER BY requested_at DESC 
            LIMIT 1
        `, [student_id], client);

        if (lastRequest.length > 0) {
            const lastRequestTime = new Date(lastRequest[0].requested_at);
            const now = new Date();
            const timeDifference = now - lastRequestTime;
            const cooldownPeriod = 30 * 60 * 1000;

            if (timeDifference < cooldownPeriod) {
                const remainingTime = cooldownPeriod - timeDifference;
                const remainingMinutes = Math.ceil(remainingTime / (1000 * 60));

                return res.status(429).json({
                    error: `You must wait ${remainingMinutes} more minutes before sending another request.`,
                    cooldownRemaining: remainingTime,
                    lastRequestTime: lastRequestTime.toISOString()
                });
            }
        }

        // Check if group is full
        const groupInfo = await queryDatabase(`
            SELECT 
                sg.mentor_id, 
                sg.title, 
                sg.max_members,
                COUNT(sgm.student_id) AS current_members
            FROM student_groups sg
            LEFT JOIN student_group_members sgm ON sg.id = sgm.group_id
            WHERE sg.id = $1
            GROUP BY sg.id, sg.mentor_id, sg.title, sg.max_members
        `, [group_id], client);

        if (!groupInfo.length) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const { mentor_id, title: group_name, max_members, current_members } = groupInfo[0];

        if (current_members >= max_members) {
            return res.status(400).json({ error: 'This group is already full.' });
        }

        // Check for existing pending request
        const existingRequest = await queryDatabase(`
            SELECT * FROM student_group_requests 
            WHERE student_id = $1 AND status = 'pending'
        `, [student_id], client);

        console.log("existingRequest", existingRequest);

        // Check if ANY existing request already belongs to this group
        const alreadyRequested = existingRequest.some(req => req.group_id === group_id);

        if (alreadyRequested) {
            console.log("You have already sent a request to this group. Please, wait for the mentor response.");
            res.status(406).json({ 
                error: 'You have already sent a request to this group. Please wait for the mentor response.' 
            });
            return;
        }

        const insertQuery = `
            INSERT INTO student_group_requests (student_id, group_id, status, requested_at) 
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const values = [student_id, group_id, 'pending', new Date()];
        const result = await queryDatabase(insertQuery, values, client);

        if (!result || result.length === 0) {
            return res.status(500).json({ error: 'Failed to create request' });
        }

        const student_group_request = result[0];

        const studentNameQuery = `SELECT name FROM messaging_users WHERE user_id = $1`;
        const studentNameValue = [student_id];
        const studentNameResult = await queryDatabase(studentNameQuery, studentNameValue, client);

        const student_name = studentNameResult[0].name
        // if (!studentNameResult || studentNameResult.length === 0) {`
        console.log("Student is ", student_name)
        // Send notification to mentor
        await sendAndStoreNotification(io, mentor_id, {
            type: 'group_invite',
            content: `${student_name} wants to join your group ${group_name}.`,
            createdBy: student_id,
            url: `/groups`
        });

        await commitTransaction(client);

        return res.json({
            message: 'Request sent successfully',
            groups: student_group_request
        });
    } catch (error) {
        await rollbackTransaction(client);
        console.error("error is", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;