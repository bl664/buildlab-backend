const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

router.delete('/', async (req, res) => {
    const { id } = req.query;
    const userId = req.user?.id; // mentor_id

    console.log("Attempting to delete group:", id, "by user:", userId);

    // Basic validation
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
        console.warn("Invalid group ID format");
        return res.status(400).json({ error: 'Invalid group ID format' });
    }

    const client = await getTransactionClient();

    try {
        // Step 1: Check if group exists and belongs to this mentor
        const groupCheck = await queryDatabase(
            `SELECT id, mentor_id FROM student_groups WHERE id = $1`,
            [id],
            client
        );

        if (groupCheck.length === 0) {
            console.warn("Group not found:", id);
            await rollbackTransaction(client);
            return res.status(404).json({ error: 'Group not found' });
        }

        if (groupCheck[0].mentor_id !== userId) {
            console.warn("Unauthorized delete attempt by user:", userId);
            await rollbackTransaction(client);
            return res.status(403).json({ error: 'You are not authorized to delete this group' });
        }

        const memberCount = await queryDatabase(
            `SELECT COUNT(*) AS count FROM student_group_members WHERE group_id = $1`,
            [id],
            client
        );

        if (parseInt(memberCount[0].count, 10) > 0) {
            console.warn("Delete blocked: members still exist in group", id);
            await rollbackTransaction(client);
            return res.status(400).json({ error: 'Cannot delete group with existing members' });
        }

        // Step 3: Safe delete
        const deleteResult = await queryDatabase(
            `DELETE FROM student_groups WHERE id = $1 RETURNING *`,
            [id],
            client
        );

        await commitTransaction(client);

        // console.log("Group deleted successfully:", id);

        return res.status(200).json({
            message: 'Group deleted successfully',
            deletedGroup: deleteResult[0]
        });
    } catch (error) {
        console.error("Error deleting group:", error);
        await rollbackTransaction(client);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
