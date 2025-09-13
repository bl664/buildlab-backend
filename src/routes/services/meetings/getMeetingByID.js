
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  console.log("getting mentor meetings")
  const userId = req.user.userId;
  const { status, project_id, limit = 50, offset = 0 } = req.query;
  
  try {
    let query = `
     SELECT
  m.id AS meeting_id,
  m.room_name,
  m.room_link,
  m.created_at,
  m.project_id,
  m.started_at,
  m.ended_at,
  mu.name AS creator_name,
  p.name AS project_name
FROM meetings m
JOIN mentor_meetings mm ON mm.meeting_id = m.id
LEFT JOIN messaging_users mu ON mu.user_id = m.created_by_id
LEFT JOIN projects p ON p.id = m.project_id
WHERE mm.mentor_id = $1;
  `;
    
    const params = [userId];

    const meetings = await queryDatabase(query, params);
    
    return res.status(200).json({
      success: true,
      data: meetings,
      count: meetings.length
    });
    
  } catch (error) {
    console.error("Get meetings error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch meetings",
      details: error.message
    });
  }
});

module.exports = router;