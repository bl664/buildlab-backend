const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/:id', async (req, res) => {
  const { id } = req.params;
console.log("fetching participants ", id)
  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Meeting ID is required"
    });
  }

  try {
    const participantsQuery = `
      SELECT DISTINCT mu.name
      FROM messaging_users mu
      WHERE mu.user_id IN (
        SELECT student_id FROM student_meetings WHERE meeting_id = $1
        UNION
        SELECT mentor_id FROM mentor_meetings WHERE meeting_id = $1
      );
    `;

    const participants = await queryDatabase(participantsQuery, [id]);
console.log("participants are", participants)

    return res.status(200).json({
      success: true,
      data: {
        meetingId: id,
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
