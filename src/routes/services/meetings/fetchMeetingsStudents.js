const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

//router.use(authMiddleware);

router.get('/', async (req, res) => {
  console.log("Fetching student meetings...");
  
  const studentId = req.user.id;
  console.log("Student ID:", studentId);
  
  if (!studentId) {
    return res.status(400).json({
      success: false,
      error: "Missing student ID",
      details: "User authentication required"
    });
  }
  
  try {
    // First, get all meeting IDs for this student
    const studentMeetingsQuery = `
      SELECT meeting_id 
      FROM student_meetings 
      WHERE student_id = $1
    `;
    
    const studentMeetingRows = await queryDatabase(studentMeetingsQuery, [studentId]);
    
    if (!studentMeetingRows || studentMeetingRows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No meetings found for student",
        data: []
      });
    }
    
    // Extract meeting IDs
    const meetingIds = studentMeetingRows.map(row => row.meeting_id);
    console.log("Found meeting IDs:", meetingIds);
    
    // Fetch meeting details one by one to avoid array issues
    const meetings = [];
    for (const meetingId of meetingIds) {
      const meetingQuery = `
        SELECT 
          m.*,
          u.name as created_by_name,
          u.email as created_by_email,
          p.name as project_name,
          p.description as project_description
        FROM meetings m
        LEFT JOIN messaging_users u ON m.created_by_id = u.user_id
        LEFT JOIN projects p ON m.project_id = p.id
        WHERE m.id = $1
        ORDER BY m.created_at DESC
      `;
      
      const meetingResults = await queryDatabase(meetingQuery, [meetingId]);
      meetings.push(...meetingResults);
    }
    
    // For each meeting, get participant details
    const meetingsWithParticipants = await Promise.all(
      meetings.map(async (meeting) => {
        try {
          // Get mentors for this meeting
          const mentorsQuery = `
            SELECT 
              mm.mentor_id,
              u.name as mentor_name,
              u.email as mentor_email
            FROM mentor_meetings mm
            LEFT JOIN messaging_users u ON mm.mentor_id = u.user_id
            WHERE mm.meeting_id = $1
          `;
          const mentors = await queryDatabase(mentorsQuery, [meeting.id]);
          
          // Get students for this meeting
          const studentsQuery = `
            SELECT 
              sm.student_id,
              u.name as student_name,
              u.email as student_email
            FROM student_meetings sm
            LEFT JOIN messaging_users u ON sm.student_id = u.user_id
            WHERE sm.meeting_id = $1
          `;
          const students = await queryDatabase(studentsQuery, [meeting.id]);
          
          return {
            ...meeting,
            mentors: mentors || [],
            students: students || []
          };
        } catch (error) {
          console.error(`Error fetching participants for meeting ${meeting.id}:`, error);
          return {
            ...meeting,
            mentors: [],
            students: []
          };
        }
      })
    );
    
    console.log(`Found ${meetings.length} meetings for student`);
    
    return res.status(200).json({
      success: true,
      message: "Student meetings fetched successfully",
      data: meetingsWithParticipants,
      count: meetings.length
    });
    
  } catch (error) {
    console.error("Fetch student meetings error:", error);
    
    let statusCode = 500;
    let errorMessage = "Internal server error";
    let errorDetails = error.message;
    
    if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = "Resource not found";
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: errorDetails
    });
  }
});

module.exports = router;
