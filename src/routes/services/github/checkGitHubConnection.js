const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("getting github user")
    try {
        const userId = req.user?.userId;
console.log("userId ", userId)
        if (!userId) {
            logger.error('User ID is missing in the request');
            return res.status(400).json({ error: 'User ID is required' });
        }

        const result = await queryDatabase(
            'SELECT * FROM github_users WHERE user_id = $1',
            [userId]
        );

        console.log("github result is ", result)

        if (result.length === 0) {
            logger.info(`GitHub not connected for user ID: ${userId}`);
            return res.status(400).json({ message: 'GitHub not connected' });
        }

        logger.info(`GitHub connection found for user ID: ${userId}`);
        return res.status(200).json(result[0]);
    } catch (error) {
        logger.error('Error fetching GitHub user info:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const authMiddleware = require('../../../middleware/auth');
// const logger = require('../../../utils/logger');
// const { queryDatabase } = require('../../../services/dbQuery');

// router.use(authMiddleware);

// router.get('/', async (req, res) => {
//     const requestId = req.headers['x-request-id'] || Date.now().toString();
//     logger.info(`[${requestId}] Getting GitHub user info`);
    
//     try {
//         // Validate user authentication
//         if (!req.user) {
//             logger.warn(`[${requestId}] No user object found in request`);
//             return res.status(401).json({ 
//                 error: 'Authentication required',
//                 message: 'User authentication is missing'
//             });
//         }

//         const userId = req.user.userId;

//         // Validate userId exists and is valid
//         if (!userId) {
//             logger.error(`[${requestId}] User ID is missing from authenticated user object`);
//             return res.status(400).json({ 
//                 error: 'Invalid user data',
//                 message: 'User ID is required but missing from authentication token'
//             });
//         }

//         // Validate userId format (assuming it should be a number or valid string)
//         if (typeof userId !== 'string' && typeof userId !== 'number') {
//             logger.error(`[${requestId}] Invalid userId format: ${typeof userId}`);
//             return res.status(400).json({ 
//                 error: 'Invalid user data',
//                 message: 'User ID format is invalid'
//             });
//         }

//         logger.info(`[${requestId}] Querying GitHub user data for userId: ${userId}`);
        
//         // Database query with timeout handling
//         const result = await Promise.race([
//             queryDatabase(
//                 'SELECT * FROM github_users WHERE user_id = $1',
//                 [userId]
//             ),
//             new Promise((_, reject) => 
//                 setTimeout(() => reject(new Error('Database query timeout')), 30000)
//             )
//         ]);

//         // Validate query result
//         if (!result) {
//             logger.error(`[${requestId}] Database query returned null/undefined result`);
//             return res.status(500).json({ 
//                 error: 'Database error',
//                 message: 'Failed to retrieve data from database'
//             });
//         }

//         if (!Array.isArray(result)) {
//             logger.error(`[${requestId}] Database query returned non-array result: ${typeof result}`);
//             return res.status(500).json({ 
//                 error: 'Database error',
//                 message: 'Unexpected data format from database'
//             });
//         }

//         if (result.length === 0) {
//             logger.info(`[${requestId}] No GitHub connection found for userId: ${userId}`);
//             return res.status(404).json({ 
//                 error: 'Not found',
//                 message: 'GitHub account not connected to this user'
//             });
//         }

//         // Validate the returned data structure
//         const githubUser = result[0];
//         if (!githubUser || typeof githubUser !== 'object') {
//             logger.error(`[${requestId}] Invalid GitHub user data structure returned from database`);
//             return res.status(500).json({ 
//                 error: 'Data error',
//                 message: 'Invalid user data retrieved from database'
//             });
//         }

//         // Remove sensitive data before sending response (if any)
//         const sanitizedUser = {
//             ...githubUser
//             // Remove sensitive fields if they exist
//             // password: undefined,
//             // access_token: undefined,
//         };

//         logger.info(`[${requestId}] Successfully retrieved GitHub user data for userId: ${userId}`);
//         return res.status(200).json({
//             success: true,
//             data: sanitizedUser
//         });

//     } catch (error) {
//         // Enhanced error logging with more context
//         logger.error(`[${requestId}] Error fetching GitHub user info:`, {
//             error: error.message,
//             stack: error.stack,
//             userId: req.user?.userId,
//             timestamp: new Date().toISOString()
//         });

//         // Handle specific error types
//         if (error.message === 'Database query timeout') {
//             return res.status(504).json({ 
//                 error: 'Timeout',
//                 message: 'Database query timed out. Please try again later.'
//             });
//         }

//         // Handle database connection errors
//         if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
//             logger.error(`[${requestId}] Database connection error: ${error.code}`);
//             return res.status(503).json({ 
//                 error: 'Service unavailable',
//                 message: 'Database service is currently unavailable'
//             });
//         }

//         // Handle SQL syntax errors (don't expose to client in production)
//         if (error.code && error.code.startsWith('42')) { // PostgreSQL syntax errors
//             logger.error(`[${requestId}] SQL syntax error: ${error.code}`);
//             return res.status(500).json({ 
//                 error: 'Internal server error',
//                 message: 'A database query error occurred'
//             });
//         }

//         // Generic error response
//         return res.status(500).json({ 
//             error: 'Internal server error',
//             message: 'An unexpected error occurred while fetching GitHub user information'
//         });
//     }
// });

// module.exports = router;