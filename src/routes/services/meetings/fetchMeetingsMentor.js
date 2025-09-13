
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
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

// // GET /meetings/mentor - Fetch all meetings for a mentor
// router.get('/', async (req, res) => {
//   console.log("Fetching mentor meetings...");
  
//   const mentorId = req.user.userId;
//   console.log("Mentor ID:", mentorId);
  
//   if (!mentorId) {
//     return res.status(400).json({
//       success: false,
//       error: "Missing mentor ID",
//       details: "User authentication required"
//     });
//   }
  
//   try {
//     // First, get all meeting IDs for this mentor
//     const mentorMeetingsQuery = `
//       SELECT meeting_id 
//       FROM mentor_meetings 
//       WHERE mentor_id = $1
//     `;
    
//     const mentorMeetingRows = await queryDatabase(mentorMeetingsQuery, [mentorId]);
    
//     if (!mentorMeetingRows || mentorMeetingRows.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "No meetings found for mentor",
//         data: []
//       });
//     }
    
//     // Extract meeting IDs
//     const meetingIds = mentorMeetingRows.map(row => row.meeting_id);
//     console.log("Found meeting IDs:", meetingIds);
    
//     // Create placeholders for the IN clause
//     const placeholders = meetingIds.map((_, index) => `$${index + 1}`).join(',');
    
//     // Fetch meeting details for all mentor meetings
//     const meetingsQuery = `
//       SELECT 
//         m.*,
//         u.name as created_by_name,
//         u.email as created_by_email,
//         p.name as project_name,
//         p.description as project_description
//       FROM meetings m
//       LEFT JOIN users u ON m.created_by_id = u.id
//       LEFT JOIN projects p ON m.project_id = p.id
//       WHERE m.id IN (${placeholders})
//       ORDER BY m.created_at DESC
//     `;
    
//     const meetings = await queryDatabase(meetingsQuery, meetingIds);
    
//     // For each meeting, get participant details
//     const meetingsWithParticipants = await Promise.all(
//       meetings.map(async (meeting) => {
//         try {
//           // Get mentors for this meeting
//           const mentorsQuery = `
//             SELECT 
//               mm.mentor_id,
//               u.name as mentor_name,
//               u.email as mentor_email
//             FROM mentor_meetings mm
//             LEFT JOIN users u ON mm.mentor_id = u.id
//             WHERE mm.meeting_id = $1
//           `;
//           const mentors = await queryDatabase(mentorsQuery, [meeting.id]);
          
//           // Get students for this meeting
//           const studentsQuery = `
//             SELECT 
//               sm.student_id,
//               u.name as student_name,
//               u.email as student_email
//             FROM student_meetings sm
//             LEFT JOIN users u ON sm.student_id = u.id
//             WHERE sm.meeting_id = $1
//           `;
//           const students = await queryDatabase(studentsQuery, [meeting.id]);
          
//           return {
//             ...meeting,
//             mentors: mentors || [],
//             students: students || []
//           };
//         } catch (error) {
//           console.error(`Error fetching participants for meeting ${meeting.id}:`, error);
//           return {
//             ...meeting,
//             mentors: [],
//             students: []
//           };
//         }
//       })
//     );
    
//     console.log(`Found ${meetings.length} meetings for mentor`);
    
//     return res.status(200).json({
//       success: true,
//       message: "Mentor meetings fetched successfully",
//       data: meetingsWithParticipants,
//       count: meetings.length
//     });
    
//   } catch (error) {
//     console.error("Fetch mentor meetings error:", error);
    
//     let statusCode = 500;
//     let errorMessage = "Internal server error";
//     let errorDetails = error.message;
    
//     if (error.message.includes('not found')) {
//       statusCode = 404;
//       errorMessage = "Resource not found";
//     }
    
//     return res.status(statusCode).json({
//       success: false,
//       error: errorMessage,
//       details: errorDetails
//     });
//   }
// });

module.exports = router;