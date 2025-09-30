const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

//router.use(authMiddleware);

router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { term } = req.query;
    console.log(`[searchUser] - Received search request for term: "${term}" from user: ${userId}`);

    try {
        // Step 1: Get mentor IDs linked to the student's groups
        const mentorResult = await queryDatabase(
            `SELECT DISTINCT mentor_id 
             FROM student_groups sg
             JOIN student_group_members sgm ON sg.id = sgm.group_id
             WHERE sgm.student_id = $1`,
            [userId]
        );

        const mentorIds = mentorResult.map(row => row.mentor_id).filter(id => id !== null);
        console.log(`[searchUser] - Found mentor IDs:`, mentorIds);

        // Step 2: Get group IDs for the student
        const StudentgroupResult = await queryDatabase(
            `SELECT group_id FROM student_group_members WHERE student_id = $1`,
            [userId]
        );

        const groupIds = StudentgroupResult.map(row => row.group_id);
        console.log(`[searchUser] - Found group IDs for student ${userId}:`, groupIds);

        let studentIds = [];
        if (groupIds.length > 0) {
            // Step 3: Get all other student_ids from same groups
            const studentResult = await queryDatabase(
                `SELECT DISTINCT student_id 
                 FROM student_group_members 
                 WHERE group_id = ANY($1::uuid[])`,
                [groupIds]
            );
            studentIds = studentResult.map(row => row.student_id);
        }

        console.log(`[searchUser] - Found peer student IDs in the same groups:`, studentIds);

        // Combine mentor IDs + student IDs
        const allUserIds = [...new Set([...studentIds, ...mentorIds])]; // unique list

        if (allUserIds.length === 0) {
            console.log(`[searchUser] - No mentor or student IDs found. Returning empty array.`);
            return res.json([]);
        }

        // Step 4: Run search in messaging_users
        const termPattern = `%${term}%`;
        const placeholders = allUserIds.map((_, i) => `$${i + 2}`).join(',');
        const values = [termPattern, ...allUserIds];

        const searchQuery = `
            SELECT user_id, name, email, role
            FROM messaging_users
            WHERE user_id IN (${placeholders})
              AND (name ILIKE $1 OR email ILIKE $1)
            LIMIT 10
        `;

        console.log(`[searchUser] - Executing search with ${allUserIds.length} potential users.`);
        const finalResult = await queryDatabase(searchQuery, values);
        console.log(`[searchUser] - Search found ${finalResult.length} users.`);

        return res.json(finalResult);

    } catch (error) {
        console.error('[searchUser] - Search error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
