const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
console.log("deleting meeting", id)
  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Meeting ID is required"
    });
  }

  let client;

  try {
    client = await getTransactionClient();
    await client.query('BEGIN');

    // Step 1: Verify permission
    const permissionQuery = `
      SELECT id FROM meetings 
      WHERE id = $1 AND created_by_id = $2
    `;
    const permissionRows = await queryDatabase(permissionQuery, [id, userId], client);

    if (!permissionRows || permissionRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: "Access denied — only the meeting creator can delete this meeting"
      });
    }

    // Step 2: Delete the meeting (ON DELETE CASCADE handles related records)
    const deleteQuery = `DELETE FROM meetings WHERE id = $1 RETURNING id`;
    const deleteResult = await queryDatabase(deleteQuery, [id], client);

    if (!deleteResult || deleteResult.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: "Meeting not found or already deleted"
      });
    }

    // Step 3: Commit the transaction
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: "Meeting deleted successfully"
    });

  } catch (error) {
    logger.error("Delete meeting error:", error);

    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error("Rollback failed:", rollbackError);
      }
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error while deleting meeting",
      details: error.message
    });

  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
