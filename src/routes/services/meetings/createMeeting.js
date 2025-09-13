const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { v4: uuidv4 } = require('uuid');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  console.log("Creating meeting...", req.body.meetingData);

  const createdById = req.user.userId;
  const { project_id, students_list, mentor_id, room_name, room_link, started_at, ended_at } = req.body.meetingData || {};
const io = req.app.get('io');

  if (!createdById) {
    return res.status(400).json({ success: false, message: "Missing creator ID" });
  }

  if (!room_link) {
    return res.status(400).json({ success: false, message: "Missing room link" });
  }

  const generatedRoomName = room_name || `buildlab-${uuidv4().slice(0, 8)}`;
  let client = null;

  try {
    client = await getTransactionClient();

    // Check for duplicate room_name or room_link
    const duplicateCheckQuery = `
      SELECT id FROM meetings
      WHERE room_name = $1 OR room_link = $2
      LIMIT 1;
    `;
    const duplicateResult = await queryDatabase(duplicateCheckQuery, [generatedRoomName, room_link], client);

    if (duplicateResult.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A meeting with the same room name or room link already exists.',
      });
    }

    const insertMeetingQuery = `
      INSERT INTO meetings (room_name, created_by_id, project_id, room_link, started_at, ended_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const meetingResult = await queryDatabase(insertMeetingQuery, [
      generatedRoomName,
      createdById,
      project_id || null,
      room_link,
      started_at || null,
      ended_at || null
    ], client);

    if (!meetingResult || meetingResult.length === 0) {
      throw new Error("Failed to create meeting.");
    }

    const meetingId = meetingResult[0].id;

    // Insert into mentor_meetings
    const mentorToInsert = mentor_id || createdById;
    await queryDatabase(
      `INSERT INTO mentor_meetings (meeting_id, mentor_id) VALUES ($1, $2);`,
      [meetingId, mentorToInsert],
      client
    );

    // Insert into student_meetings
    if (Array.isArray(students_list) && students_list.length > 0) {
      const insertStudentPromises = students_list.map(studentId => {
        if (!studentId) return Promise.resolve();

        return queryDatabase(
          `INSERT INTO student_meetings (meeting_id, student_id) VALUES ($1, $2);`,
          [meetingId, studentId],
          client
        ).catch(err => {
          console.error(`Failed to add student ${studentId} to meeting:`, err.message);
        });
      });

      await Promise.all(insertStudentPromises);
    }

    await client.query('COMMIT');

    const meetingDetailQuery = `
     SELECT 
        m.id as meeting_id,
        m.room_name,
        m.room_link,
        m.created_at,
        m.project_id,
        m.started_at,
        m.ended_at,
        mu.name AS creator_name,
        p.name as project_name
      FROM meetings m
      JOIN mentor_meetings mm ON mm.meeting_id = m.id
      LEFT JOIN messaging_users mu ON mu.user_id = m.created_by_id
      LEFT JOIN projects p ON p.id = m.project_id
      WHERE m.id = $1;
`;
    const completeMeetingResult = await queryDatabase(meetingDetailQuery, [meetingId]);

    if (!completeMeetingResult || completeMeetingResult.length === 0) {
      throw new Error("Failed to fetch complete meeting data.");
    }

    const formattedMeetingData = completeMeetingResult[0];

     const sendNotification = students_list.map(async (studentId) => {
      console.log("Sending notification to ", studentId)
      await sendAndStoreNotification(io, studentId, {
                type: 'New Meeting',
                content: `New Meeting ${room_name}  is created. `,
                createdBy: createdById,
                url: '/'
            });
    })

    return res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: formattedMeetingData
    });
  } catch (error) {
    console.error('Meeting creation error:', error.message);
    if (client) await client.query('ROLLBACK');

    return res.status(500).json({
      success: false,
      message: 'Failed to create meeting',
      error: error.message
    });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
