const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');

// GET group by ID (including its projects)
router.get('/', async (req, res) => {
  const { id } = req.query;
  console.log('➡️ Fetching group by ID:', id);

  // Validate UUID format
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    console.log('❌ Invalid group ID format');
    return res.status(400).json({ error: 'Invalid group ID format' });
  }

  try {
    // 1️⃣ Fetch group details
    const groupQuery = `
      SELECT 
        sg.*, 
        mu.name AS mentor_name,
        (
          SELECT COUNT(*) 
          FROM student_group_members sgm 
          WHERE sgm.group_id = sg.id
        ) AS current_members
      FROM student_groups sg
      LEFT JOIN messaging_users mu 
        ON mu.user_id = sg.mentor_id
      WHERE sg.id = $1;
    `;
    const groupResult = await queryDatabase(groupQuery, [id]);

    if (!groupResult || groupResult.length === 0) {
      console.log('⚠️ Group not found');
      return res.status(404).json({ error: 'Group not found' });
    }
console.log('✅ Group details fetched:', groupResult[0]);
    const group = groupResult[0];

    // 2️⃣ Fetch associated projects
    const projectQuery = `
      SELECT 
        id,
        title,
        description,
        status,
        tags,
        techstack,
        skillsrequired,
        level
      FROM student_group_projects
      WHERE group_id = $1
    `;
    const projectsResult = await queryDatabase(projectQuery, [id]);

    group.projects = projectsResult || [];

    console.log(`✅ Group fetched with ${group.projects} project(s)`);

    // 3️⃣ Return combined data
    return res.json({
      message: 'Fetched successfully',
      group,
    });
  } catch (error) {
    console.error('❌ Error fetching group and projects:', error);
    return res.status(500).json({ error: 'Server error while fetching group and projects' });
  }
});

module.exports = router;
