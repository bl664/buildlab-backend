const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Meeting ID is required"
    });
  }
  
  try {
    // Check if user has access to this meeting
    const accessQuery = `
      SELECT DISTINCT m.*, 
             u.name as creator_name,
             u.email as creator_email,
             p.name as project_name
      FROM meetings m
      LEFT JOIN users u ON m.created_by_id = u.id
      LEFT JOIN projects p ON m.project_id = p.id
      LEFT JOIN mentor_meetings mm ON m.id = mm.meeting_id
      LEFT JOIN student_meetings sm ON m.id = sm.meeting_id
      WHERE m.id = $1 AND (mm.mentor_id = $2 OR sm.student_id = $2 OR m.created_by_id = $2)
    `;
    
    const meetingRows = await queryDatabase(accessQuery, [id, userId]);
    
    if (!meetingRows || meetingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found or access denied"
      });
    }
    
    const meeting = meetingRows[0];
    
    // Get participants
    const participantsQuery = `
      SELECT 'mentor' as role, u.id, u.name, u.email, mm.joined_at, mm.left_at
      FROM mentor_meetings mm
      JOIN users u ON mm.mentor_id = u.id
      WHERE mm.meeting_id = $1
      UNION ALL
      SELECT 'student' as role, u.id, u.name, u.email, sm.joined_at, sm.left_at
      FROM student_meetings sm
      JOIN users u ON sm.student_id = u.id
      WHERE sm.meeting_id = $1
      ORDER BY joined_at ASC
    `;
    
    const participants = await queryDatabase(participantsQuery, [id]);
    
    return res.status(200).json({
      success: true,
      data: {
        ...meeting,
        participants
      }
    });
    
  } catch (error) {
    console.error("Get meeting by ID error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch meeting",
      details: error.message
    });
  }
});
module.exports = router;