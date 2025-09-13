const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const jwt = require('jsonwebtoken');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);

router.put('/', async (req, res) => {
  console.log("updating team...")
      const io = req.app.get('io');

  try {
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);
    const user_id = decoded.userId;
console.log("req.body.updates", req.body.updates)

    const { team_id, team_name, team_description, students, rolesData } = req.body.updates;

    if (!team_id || !team_name || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Update the team info
    const updateTeamQuery = `
      UPDATE teams
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3;
    `;
    await queryDatabase(updateTeamQuery, [team_name, team_description, team_id]);

    // 2. Delete existing student-team mappings
    const deleteStudentTeamsQuery = `
      DELETE FROM student_teams WHERE team_id = $1;
    `;
    await queryDatabase(deleteStudentTeamsQuery, [team_id]);

    // 3. Insert updated student-team-role mappings
    const insertStudentTeamQuery = `
      INSERT INTO student_teams (team_id, student_id, role)
      VALUES ($1, $2, $3);
    `;

    // const { teamLead, designer, developer, qaEngineer } = rolesData;

    for (const student of students) {
console.log("student id is ", student)
      await queryDatabase(insertStudentTeamQuery, [team_id, student.student_id, student.student_role || "developer"]) ;
    }

    const sendNotification = students.map(async (student) => {
      await sendAndStoreNotification(io, student.student_id, {
        type: 'Team Update',
        content: `Your team "${team_name}" has been updated.`,
        createdBy: user_id,
        url: `/teams/${team_id}`,
      });
    });


    return res.status(200).json({ message: 'Team updated successfully' });

  } catch (error) {
    console.error('Error updating team:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
