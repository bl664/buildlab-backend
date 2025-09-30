
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
//router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting groups")
       

     
    const mentor_id = req.user.id
    console.log("mentorid", mentor_id)
    try {
    const query = `
    SELECT 
    g.id,
    g.title,
    g.description,
    g.tags,
    g.status,
    g.max_members,
    g.created_at,
    COUNT(m.id) AS member_count
FROM student_groups g
LEFT JOIN student_group_members m
    ON g.id = m.group_id
WHERE g.mentor_id = $1
GROUP BY g.id, g.title, g.description, g.tags, g.max_members;

    `;
        const values = [mentor_id];

        const result = await queryDatabase(query, values);
        const student_groups = result;
console.log("student_groups", student_groups)
        return res.json({
            message: 'fetched',
            groups: student_groups
        })
    } catch(error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

