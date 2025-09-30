
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
//router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting Teams for student")
       
     
    const student_id = req.user.id
    console.log("student_id", student_id)
    try {
        const query = `
SELECT
    t.id AS id,
    t.name AS name,
    t.created_at AS created_at,
    t.updated_at AS updated_at,
    t.description AS description,
    COALESCE(p.name, '') AS project_name,
    mu_mentor.name AS mentor_name,
    (
        SELECT COUNT(*)
        FROM student_teams st2
        WHERE st2.team_id = t.id
    ) AS member_count
FROM
    student_teams st
JOIN
    teams t ON st.team_id = t.id
LEFT JOIN
    projects p ON 
        CASE 
            WHEN (t.project_association::text) ~ '^[0-9a-fA-F-]{36}$' 
            THEN t.project_association 
            ELSE NULL 
        END = p.id
LEFT JOIN
    messaging_users mu_mentor ON mu_mentor.user_id = t.mentor_id
WHERE
    st.student_id = $1;

        `;
        const values = [student_id];

        const result = await queryDatabase(query, values);
        const teams = result;
console.log("teams are", teams)
        return res.json({
            message: 'fetched',
            result: teams
        })
    } catch(error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

