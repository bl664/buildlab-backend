
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  console.log("Fetching student meetings...");
  
  const studentId = req.user.userId;
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
    
    // Create placeholders for the IN clause
    const placeholders = meetingIds.map((_, index) => `$${index + 1}`).join(',');
    
    // Fetch meeting details for all student meetings
    const meetingsQuery = `
      SELECT 
        m.*,
        u.name as created_by_name,
        u.email as created_by_email,
        p.name as project_name,
        p.description as project_description
      FROM meetings m
      LEFT JOIN users u ON m.created_by_id = u.id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE m.id IN (${placeholders})
      ORDER BY m.created_at DESC
    `;
    
    const meetings = await queryDatabase(meetingsQuery, meetingIds);
    
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
            LEFT JOIN users u ON mm.mentor_id = u.id
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
            LEFT JOIN users u ON sm.student_id = u.id
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

// GET /meetings/all - Fetch all meetings for the authenticated user (works for both mentors and students)
router.get('/all', async (req, res) => {
  console.log("Fetching all meetings for user...");
  
  const userId = req.user.userId;
  console.log("User ID:", userId);
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: "Missing user ID",
      details: "User authentication required"
    });
  }
  
  try {
    // Get meeting IDs from both mentor_meetings and student_meetings
    const allMeetingsQuery = `
      SELECT meeting_id, 'mentor' as participant_type FROM mentor_meetings WHERE mentor_id = $1
      UNION
      SELECT meeting_id, 'student' as participant_type FROM student_meetings WHERE student_id = $1
    `;
    
    const allMeetingRows = await queryDatabase(allMeetingsQuery, [userId]);
    
    if (!allMeetingRows || allMeetingRows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No meetings found for user",
        data: []
      });
    }
    
    // Extract unique meeting IDs
    const uniqueMeetingIds = [...new Set(allMeetingRows.map(row => row.meeting_id))];
    console.log("Found unique meeting IDs:", uniqueMeetingIds);
    
    // Create placeholders for the IN clause
    const placeholders = uniqueMeetingIds.map((_, index) => `$${index + 1}`).join(',');
    
    // Fetch meeting details
    const meetingsQuery = `
      SELECT 
        m.*,
        u.name as created_by_name,
        u.email as created_by_email,
        p.name as project_name,
        p.description as project_description
      FROM meetings m
      LEFT JOIN users u ON m.created_by_id = u.id
      LEFT JOIN projects p ON m.project_id = p.id
      WHERE m.id IN (${placeholders})
      ORDER BY m.created_at DESC
    `;
    
    const meetings = await queryDatabase(meetingsQuery, uniqueMeetingIds);
    
    // For each meeting, get participant details and user's role in the meeting
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
            LEFT JOIN users u ON mm.mentor_id = u.id
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
            LEFT JOIN users u ON sm.student_id = u.id
            WHERE sm.meeting_id = $1
          `;
          const students = await queryDatabase(studentsQuery, [meeting.id]);
          
          // Determine user's participation type in this meeting
          const userParticipationTypes = [];
          if (mentors.some(mentor => mentor.mentor_id === userId)) {
            userParticipationTypes.push('mentor');
          }
          if (students.some(student => student.student_id === userId)) {
            userParticipationTypes.push('student');
          }
          
          return {
            ...meeting,
            mentors: mentors || [],
            students: students || [],
            user_participation_types: userParticipationTypes
          };
        } catch (error) {
          console.error(`Error fetching participants for meeting ${meeting.id}:`, error);
          return {
            ...meeting,
            mentors: [],
            students: [],
            user_participation_types: []
          };
        }
      })
    );
    
    console.log(`Found ${meetings.length} meetings for user`);
    
    return res.status(200).json({
      success: true,
      message: "All meetings fetched successfully",
      data: meetingsWithParticipants,
      count: meetings.length
    });
    
  } catch (error) {
    console.error("Fetch all meetings error:", error);
    
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