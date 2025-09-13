const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("Getting chat contacts for user:", req.user.userId);
    
    try {
        const userId = req.user.userId; // From auth middleware
        
        // Get distinct users who have exchanged messages with current user
        // Along with their last message and timestamp
        const query = `
       SELECT DISTINCT
    u.user_id,
    u.name,
    u.email,
    u.role,
    u.is_online
FROM messaging_users u
INNER JOIN (
    SELECT 
        CASE
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
        END AS other_user_id
    FROM messages
    WHERE sender_id = $1 OR receiver_id = $1
) msg_users
ON u.user_id = msg_users.other_user_id;
        `;
        
        const result = await queryDatabase(query, [userId]);
        
        console.log(`Fetched ${result.length} chat contacts for user ${userId}`, result);
        
        return res.json({
            message: 'Chat contacts fetched successfully',
            contacts: result
        });
        
    } catch (error) {
        logger.error('Error fetching chat contacts', { 
            user_id: req.user?.userId, 
            error: error.message 
        });
        res.status(500).json({ error: 'Failed to fetch chat contacts' });
    }
});


module.exports = router;