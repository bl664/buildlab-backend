const express = require('express');
const router = express.Router();
const {
  queryDatabase,
  getTransactionClient,
  commitTransaction,
  rollbackTransaction,
} = require('../../../services/dbQuery');

router.post('/', async (req, res) => {
  console.log('➡️ Creating group...', req.body);
  const mentor_id = req.user.id;
  const client = await getTransactionClient();

  try {
    const { title, description, status, max_members, tags, projects } = req.body.groupData;

    // 1️⃣ Create the group
    const groupCreateQuery = `
      INSERT INTO student_groups (title, description, status, mentor_id, max_members, tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    const groupCreateValues = [title, description, status, mentor_id, max_members, tags];
    const groupCreateResult = await queryDatabase(groupCreateQuery, groupCreateValues, client);

    const groupId = groupCreateResult[0].id;
    console.log('✅ Group created with ID:', groupId);

    // 2️⃣ If there are projects, insert them
    if (Array.isArray(projects) && projects.length > 0) {
      console.log(`🧩 Inserting ${projects.length} project(s)...`, projects);

      for (const project of projects) {
        const {
          title,
          description,
          status = '1',
          tags = [],
          techStack = [],
          skillsRequired = [],
          level = '0',
        } = project;

        const projectInsertQuery = `
          INSERT INTO student_group_projects
            (group_id, title, description, status, tags, techstack, skillsrequired, level)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;

        const projectInsertValues = [
          groupId,
          title,
          description,
          status,
          tags,
          techStack,
          skillsRequired,
          level,
        ];

        await queryDatabase(projectInsertQuery, projectInsertValues, client);
      }

      console.log('✅ All projects inserted successfully.');
    } else {
      console.log('⚠️ No projects to insert for this group.');
    }

    // 3️⃣ Commit the transaction
    await commitTransaction(client);

    res.status(201).json({
      message: 'Group and associated projects created successfully',
      groupId,
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('❌ Error creating group with projects:', error);
    res.status(500).json({ error: 'Error creating group and projects' });
  }
});

module.exports = router;
