const express = require('express');
const router = express.Router();
const { 
  queryDatabase, 
  getTransactionClient, 
  commitTransaction, 
  rollbackTransaction 
} = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.post('/', async (req, res) => {
  const mentor_id = req.user?.id;
  const io = req.app.get('io');
  const { request_id } = req.body;

  if (!mentor_id || !request_id) {
    return res.status(400).json({ error: 'Missing mentor_id or request_id' });
  }

  let client;
  try {
    // ✅ Start transaction
    client = await getTransactionClient();

    // ✅ Fetch request details (must belong to this mentor)
    const requestDetails = await queryDatabase(`
      SELECT 
        sgr.*, 
        sg.title AS group_name
      FROM student_group_requests sgr
      JOIN student_groups sg ON sgr.group_id = sg.id
      WHERE sgr.id = $1 
      AND sg.mentor_id = $2 
      AND sgr.status = 'pending'
    `, [request_id, mentor_id], client);

    if (!requestDetails.length) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    const request = requestDetails[0];

    // ✅ Reject the request
    await queryDatabase(`
       DELETE FROM student_group_requests
        WHERE id = $1 AND status = 'pending'
    `, [request_id], client);

    // ✅ Delete any related invite notification
    await queryDatabase(`
  DELETE FROM notifications n
  USING notification_recipients nr
  WHERE n.id = nr.notification_id
  AND n.created_by = $1
  AND nr.user_id = $2
  AND n.type = 'group_invite'
  AND n.created_at >= $3
`, [request.student_id, mentor_id, request.requested_at], client);


    // ✅ Commit DB changes
    await commitTransaction(client);

    // ✅ Notify student after commit (to avoid hanging transaction)
    await sendAndStoreNotification(io, request.student_id, {
      type: 'group_request_rejected',
      content: `Your request to join "${request.group_name}" was not approved. You can try joining other groups.`,
      createdBy: mentor_id,
      url: '/groups'
    });


    return res.json({ message: 'Request rejected successfully' });

  } catch (error) {
    // Rollback in case of any failure
    if (client) await rollbackTransaction(client);
    console.error(`❌ Error rejecting request ${request_id} by mentor ${mentor_id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');
// const { sendAndStoreNotification } = require('../../../utils/notificationService');

// router.post('/', async (req, res) => {
//     const mentor_id = req.user.id;
//     const io = req.app.get('io');
//     const { request_id } = req.body;

//     if (!mentor_id || !request_id) {
//         console.log("Missing mentor_id or request_id")
//         return res.status(400).json({ error: 'There is some error. Please try again later' });
//     }

//     let client;
    
//     try {
//         client = await getTransactionClient()
//         const requestDetails = await queryDatabase(`
//             SELECT 
//                 sgr.*,
//                 sg.title as group_name
//             FROM student_group_requests sgr
//             JOIN student_groups sg ON sgr.group_id = sg.id
//             WHERE sgr.id = $1 AND sg.mentor_id = $2 AND sgr.status = 'pending'
//         `, [request_id, mentor_id], client);

//         if (!requestDetails.length) {
//             await rollbackTransaction(client)
//             return res.status(404).json({ error: 'Request not found or unauthorized' });
//         }

//         const request = requestDetails[0];

//         try {
//             // Update request status
//             await queryDatabase(`
//                 UPDATE student_group_requests 
//                 SET status = 'rejected', responded_at = NOW()
//                 WHERE id = $1
//             `, [request_id], client);

//             // Delete the original notification
//             await queryDatabase(`
//                 DELETE FROM notifications 
//                 WHERE created_by = $1 
//                 AND recipient_id = $2 
//                 AND type = 'group_invite'
//                 AND created_at >= $3
//             `, [request.student_id, mentor_id, request.requested_at], client);

//             await commitTransaction(client)
//             // Send rejection notification to student
//             await sendAndStoreNotification(io, request.student_id, {
//                 type: 'group_request_rejected',
//                 content: `Your request to join "${request.group_name}" was not approved. You can try joining other groups.`,
//                 createdBy: mentor_id,
//                 url: '/groups'
//             });

//             res.json({ message: 'Request rejected successfully' });
//         } catch (error) {
//             await rollbackTransaction(client)
//             throw error;
//         }

//     } catch (error) {
//         await rollbackTransaction(client)
//         console.error("Error rejecting request:", error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

// module.exports = router;
