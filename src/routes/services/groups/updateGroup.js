const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

// Update group and projects
router.put('/', async (req, res) => {
  const { id } = req.query;
  const userId = req.user?.id;
  const { title, description, tags, max_members, projects } = req.body.groupData || {};
  
  console.log("Trying to update group by id:", id, "by user:", userId);
  console.log("Group data:", { title, description, tags, max_members });
  console.log("Projects data:", projects);

  // Basic validation
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    console.warn("Invalid group ID format");
    return res.status(400).json({ error: 'Invalid group ID format' });
  }

  const client = await getTransactionClient();

  try {
    // 1️⃣ Check if group exists and user is the mentor
    const existingGroup = await queryDatabase(
      `SELECT mentor_id, title, description, tags, max_members FROM student_groups WHERE id = $1`,
      [id],
      client
    );

    if (existingGroup.length === 0) {
      console.warn("Group not found:", id);
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = existingGroup[0];

    if (group.mentor_id !== userId) {
      console.warn("Unauthorized update attempt by:", userId);
      await rollbackTransaction(client);
      return res.status(403).json({ error: 'You are not authorized to update this group' });
    }

    // 2️⃣ Validate max_members against current members
    if (max_members) {
      const currentMembersResult = await queryDatabase(
        `SELECT COUNT(*) as count FROM student_group_members WHERE group_id = $1`,
        [id],
        client
      );
      const currentMembersCount = parseInt(currentMembersResult[0].count);

      if (max_members < currentMembersCount) {
        console.warn("Max members cannot be less than current members:", currentMembersCount);
        await rollbackTransaction(client);
        return res.status(400).json({ 
          error: `Maximum members cannot be less than current members (${currentMembersCount})` 
        });
      }
    }

    // 3️⃣ Build dynamic update query for group (only for changed fields)
    const updates = [];
    const values = [];
    let index = 1;

    if (title && title !== group.title) {
      updates.push(`title = $${index++}`);
      values.push(title);
    }

    if (description !== undefined && description !== group.description) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    if (Array.isArray(tags) && JSON.stringify(tags) !== JSON.stringify(group.tags)) {
      updates.push(`tags = $${index++}`);
      values.push(tags);
    }

    if (max_members && max_members !== group.max_members) {
      updates.push(`max_members = $${index++}`);
      values.push(max_members);
    }

    // 4️⃣ Update group if there are changes
    let updatedGroup = group;
    if (updates.length > 0) {
      const updateQuery = `
        UPDATE student_groups
        SET ${updates.join(', ')}
        WHERE id = $${index}
        RETURNING *;
      `;
      values.push(id);

      const result = await queryDatabase(updateQuery, values, client);
      updatedGroup = result[0];
      console.log("✅ Group updated successfully");
    } else {
      console.log("No group changes detected");
    }

    // 5️⃣ Handle Projects Update
    if (Array.isArray(projects)) {
      console.log("Processing projects update...");

      // Get existing projects for this group
      const existingProjects = await queryDatabase(
        `SELECT id FROM student_group_projects WHERE group_id = $1`,
        [id],
        client
      );

      const existingProjectIds = existingProjects.map(p => p.id);
      const incomingProjectIds = projects
        .map(p => p.id)
        .filter(pid => pid && !pid.startsWith('project-')); // Filter out temporary IDs

      // 5a️⃣ Delete projects that are no longer in the list
      const projectsToDelete = existingProjectIds.filter(
        existingId => !incomingProjectIds.includes(existingId)
      );

      if (projectsToDelete.length > 0) {
        await queryDatabase(
          `DELETE FROM student_group_projects WHERE id = ANY($1)`,
          [projectsToDelete],
          client
        );
        console.log(`✅ Deleted ${projectsToDelete.length} projects`);
      }

      // 5b️⃣ Process each project (insert or update)
      for (const project of projects) {
        const {
          id: projectId,
          title: projectTitle,
          description: projectDescription,
          status,
          tags: projectTags,
          tech_stack,
          skills_required,
          level
        } = project;

        // Map frontend status to database values
        const dbStatus = status === 'active' ? '1' : status === 'inactive' ? '2' : '0'; // '0' = pending, '1' = active, '2' = inactive
        
        // Map frontend level to database values
        const dbLevel = level === 'beginner' ? '0' : level === 'intermediate' ? '1' : '2'; // '0' = beginner, '1' = intermediate, '2' = advanced

        // Check if this is a new project (temporary ID starting with 'project-')
        const isNewProject = !projectId || projectId.startsWith('project-');
console.log("existance", isNewProject, projectId)
        if (isNewProject) {
          // 5c️⃣ Insert new project
          await queryDatabase(
            `INSERT INTO student_group_projects 
              (group_id, title, description, status, tags, techstack, skillsrequired, level)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              id,
              projectTitle || '',
              projectDescription || '',
              dbStatus,
              projectTags || [],
              tech_stack || [],
              skills_required || [],
              dbLevel
            ],
            client
          );
          console.log(`✅ Inserted new project: ${projectTitle}`);
        } else {
          console.log("Update existing project")
          await queryDatabase(
            `UPDATE student_group_projects 
             SET title = $1, 
                 description = $2, 
                 status = $3, 
                 tags = $4, 
                 techstack = $5, 
                 skillsrequired = $6, 
                 level = $7
             WHERE id = $8 AND group_id = $9`,
            [
              projectTitle || '',
              projectDescription || '',
              dbStatus,
              projectTags || [],
              tech_stack || [],
              skills_required || [],
              dbLevel,
              projectId,
              id
            ],
            client
          );
          console.log(`✅ Updated project: ${projectTitle}`);
        }
      }
    }

    await commitTransaction(client);

    console.log("✅ Group and projects updated successfully");

    return res.status(200).json({
      message: 'Group updated successfully',
      // group: {
      //   // ...finalGroup[0],
      //   // projects: updatedProjects
      //   message: 'Group and projects updated successfully'
      // }
    });

  } catch (error) {
    console.error("❌ Error updating group:", error);
    await rollbackTransaction(client);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

module.exports = router;
// const express = require('express');
// const router = express.Router();
// const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

// // Update group
// router.put('/', async (req, res) => {
//   const { id } = req.query;
//   const userId = req.user?.id;
//   const { title, description, tags, max_members } = req.body.groupData || {};

//   console.log("Trying to update group by id:", id, "by user:", userId, title, description, tags, max_members);

//   // Basic validation
//   if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
//     console.warn("Invalid group ID format");
//     return res.status(400).json({ error: 'Invalid group ID format' });
//   }

//   const client = await getTransactionClient();

//   try {
//     // 1️⃣ Check if group exists and user is the mentor
//     const existingGroup = await queryDatabase(
//       `SELECT mentor_id, title, description, tags, max_members FROM student_groups WHERE id = $1`,
//       [id],
//       client
//     );

//     if (existingGroup.length === 0) {
//       console.warn("Group not found:", id);
//       await rollbackTransaction(client);
//       return res.status(404).json({ error: 'Group not found' });
//     }

//     const group = existingGroup[0];

//     if (group.mentor_id !== userId) {
//       console.warn("Unauthorized update attempt by:", userId);
//       await rollbackTransaction(client);
//       return res.status(403).json({ error: 'You are not authorized to update this group' });
//     }

//         // 2️⃣ Validate max_members against current members
//     if (max_members) {
//       const currentMembersResult = await queryDatabase(
//         `SELECT COUNT(*) as count FROM student_group_members WHERE group_id = $1`,
//         [id],
//         client
//       );
//       const currentMembersCount = parseInt(currentMembersResult[0].count);

//       if (max_members < currentMembersCount) {
//         console.warn("Max members cannot be less than current members:", currentMembersCount);
//         await rollbackTransaction(client);
//         return res.status(400).json({ 
//           error: `Maximum members cannot be less than current members (${currentMembersCount})` 
//         });
//       }
//     }


//     // 3️⃣ Build dynamic update query (only for changed fields)
//     const updates = [];
//     const values = [];
//     let index = 1;

//     if (title && title !== group.title) {
//       updates.push(`title = $${index++}`);
//       values.push(title);
//     }

//     if (description && description !== group.description) {
//       updates.push(`description = $${index++}`);
//       values.push(description);
//     }

//     if (Array.isArray(tags) && JSON.stringify(tags) !== JSON.stringify(group.tags)) {
//       updates.push(`tags = $${index++}`);
//       values.push(tags); 
//     }

//     if (max_members && max_members !== group.max_members) {
//       updates.push(`max_members = $${index++}`);
//       values.push(max_members);
//     }

//     if (updates.length === 0) {
//       console.log("No changes detected — skipping update");
//       await rollbackTransaction(client);
//       return res.status(200).json({ message: 'No changes detected', group });
//     }

//     // 3️⃣ Run update
//     const updateQuery = `
//       UPDATE student_groups 
//       SET ${updates.join(', ')}
//       WHERE id = $${index}
//       RETURNING *;
//     `;
//     values.push(id);

//     const updatedGroup = await queryDatabase(updateQuery, values, client);
//     await commitTransaction(client);

//     console.log("✅ Group updated successfully:", updatedGroup[0]);

//     return res.status(200).json({
//       message: 'Group updated successfully',
//       group: updatedGroup[0],
//     });
//   } catch (error) {
//     console.error("❌ Error updating group:", error);
//     await rollbackTransaction(client);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// module.exports = router;
