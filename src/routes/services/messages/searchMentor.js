// routes/search-mentor.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("Getting search mentors");
    const userId = req.user.userId;
    const { term } = req.query;
    console.log("Search term:", term);

    try {
        // Step 1: Get the role of the current user
        const roleResult = await queryDatabase(
            `SELECT role FROM messaging_users WHERE user_id = $1`,
            [userId]
        );

        if (roleResult.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userRole = roleResult[0].role;
        let mentorIds = [];

        if (userRole === 'student') {
            // Step 2a: If student, find their group_id(s)
            const groupResult = await queryDatabase(
                `SELECT group_id FROM student_group_members WHERE student_id = $1`,
                [userId]
            );

            const groupIds = groupResult.map(row => row.group_id);

            if (groupIds.length === 0) {
                return res.json([]);
            }

            // Step 2b: Get mentor_ids from those groups
            const mentorResult = await queryDatabase(
                `SELECT DISTINCT mentor_id FROM student_groups WHERE id = ANY($1::uuid[])`,
                [groupIds]
            );

            mentorIds = mentorResult.map(row => row.mentor_id).filter(id => id !== null);

        } else if (userRole === 'mentor') {
            // Step 3: If mentor, they can search all mentors (excluding themselves)
            // We'll filter out the current user in the final query
            const allMentorsResult = await queryDatabase(
                `SELECT user_id FROM messaging_users WHERE role = 'mentor' AND user_id != $1`,
                [userId]
            );

            mentorIds = allMentorsResult.map(row => row.user_id);
        }

        if (mentorIds.length === 0) {
            return res.json([]);
        }

        // Step 4: Get matching mentors from messaging_users
        const termPattern = `%${term}%`;

        const placeholders = mentorIds.map((_, i) => `$${i + 2}`).join(',');
        const values = [termPattern, ...mentorIds];

        const searchQuery = `
            SELECT user_id, name, email, role
            FROM messaging_users
            WHERE user_id IN (${placeholders})
            AND (name ILIKE $1 OR email ILIKE $1)
            AND role = 'mentor'
            LIMIT 10
        `;

        const finalResult = await queryDatabase(searchQuery, values);
console.log("mentors are", finalResult)
        return res.json(finalResult);

    } catch (error) {
        console.error('Mentor search error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;