const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log('fetchning messages....')
    const { senderId, receiverId } = req.query;
    console.log("ids aee", senderId, receiverId)
    if (!senderId || !receiverId) {
        return res.status(400).json({ error: "senderId and receiverId are required" });
    }

    try {
        const messages = await queryDatabase(
            "SELECT * FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) ORDER BY created_at ASC",
            [senderId, receiverId]
        );
        console.log("mssags are", messages)
        res.status(200).json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err.message);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

module.exports = router;