const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

// Update group
router.put('/', async (req, res) => {
  const { id } = req.query;
  const userId = req.user?.id;
  const { title, description, tags, max_members } = req.body.groupData || {};

  console.log("Trying to update group by id:", id, "by user:", userId, title, description, tags, max_members);

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

    // 2️⃣ Build dynamic update query (only for changed fields)
    const updates = [];
    const values = [];
    let index = 1;

    if (title && title !== group.title) {
      updates.push(`title = $${index++}`);
      values.push(title);
    }

    if (description && description !== group.description) {
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

    if (updates.length === 0) {
      console.log("No changes detected — skipping update");
      await rollbackTransaction(client);
      return res.status(200).json({ message: 'No changes detected', group });
    }

    // 3️⃣ Run update
    const updateQuery = `
      UPDATE student_groups 
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *;
    `;
    values.push(id);

    const updatedGroup = await queryDatabase(updateQuery, values, client);
    await commitTransaction(client);

    console.log("✅ Group updated successfully:", updatedGroup[0]);

    return res.status(200).json({
      message: 'Group updated successfully',
      group: updatedGroup[0],
    });
  } catch (error) {
    console.error("❌ Error updating group:", error);
    await rollbackTransaction(client);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
