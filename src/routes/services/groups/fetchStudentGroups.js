
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
//router.use(authMiddleware);

router.get('/', async (req, res) => {

     
    const student_id = req.user.id
    // console.log("student_id", student_id)
    try {
        const query = `
        SELECT 
    sg.id,
    sg.title,
    sg.description,
    sg.max_members,
    sg.created_at,
    sg.tags,
    COALESCE(member_count.current_members, 0) as current_members,
    (sg.max_members - COALESCE(member_count.current_members, 0)) as available_spots
FROM student_groups sg
LEFT JOIN (
    SELECT 
        group_id,
        COUNT(*) as current_members
    FROM student_group_members
    GROUP BY group_id
) member_count ON sg.id = member_count.group_id
WHERE sg.status = 'active'
    AND (sg.max_members IS NULL OR COALESCE(member_count.current_members, 0) < sg.max_members)
    AND sg.id NOT IN (
        SELECT group_id 
        FROM student_group_members 
        WHERE student_id = $1
    )
ORDER BY sg.created_at DESC;

    `;

        const result = await queryDatabase(query, [student_id]);

        const student_groups = result;
// console.log("student_groups are", student_groups)
        return res.json({
            message: 'fetched',
            groups: student_groups
        })
    } catch(error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

