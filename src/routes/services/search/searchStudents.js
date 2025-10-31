const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

//router.use(authMiddleware);

router.get('/', async (req, res) => {
    const userId = req.user.id;
    const { term } = req.query;

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
        let studentIds = [];

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

            // Step 2b: Get all other student_ids from same groups
            const studentResult = await queryDatabase(
                `SELECT DISTINCT student_id FROM student_group_members WHERE group_id = ANY($1::uuid[])`,
                [groupIds]
            );

            studentIds = studentResult.map(row => row.student_id);

        } else if (userRole === 'mentor') {
            // Step 3a: If mentor, find all group_ids they mentor
            const groupResult = await queryDatabase(
                `SELECT id FROM student_groups WHERE mentor_id = $1`,
                [userId]
            );

            const groupIds = groupResult.map(row => row.id);

            if (groupIds.length === 0) {
                return res.json([]);
            }

            // Step 3b: Get student_ids in those groups
            const studentResult = await queryDatabase(
                `SELECT DISTINCT student_id FROM student_group_members WHERE group_id = ANY($1::uuid[])`,
                [groupIds]
            );

            studentIds = studentResult.map(row => row.student_id);

        }

        if (studentIds.length === 0) {
            return res.json([]);
        }

        // Step 4: Get matching students from messaging_users
        const termPattern = `%${term}%`;

        const placeholders = studentIds.map((_, i) => `$${i + 2}`).join(',');
        const values = [termPattern, ...studentIds];

        const searchQuery = `
            SELECT user_id, name, email, role
            FROM messaging_users
            WHERE user_id IN (${placeholders})
            AND (name ILIKE $1 OR email ILIKE $1)
            LIMIT 10
        `;

        const finalResult = await queryDatabase(searchQuery, values);
        return res.json(finalResult);

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
