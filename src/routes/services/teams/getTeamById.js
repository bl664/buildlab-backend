
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    const { id } = req.query;
console.log("trying to fetch team by id", id)
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
        console.log("invalid team id format")
        return res.status(400).json({ error: 'Invalid team ID format' });
    }

    try {
       const query = `
SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.description AS team_description,
    t.created_at AS team_createdat,
    t.updated_at AS team_updatedat,
    t.project_association AS project_id,
    p.name AS project_name,
    t.mentor_id AS mentor_id,
    mu_mentor.name AS mentor_name,

    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'student_id', st.student_id,
                'student_name', mu_student.name,
                'student_role', st.role
            )
        ) FILTER (WHERE st.student_id IS NOT NULL),
        '[]'
    ) AS students

FROM teams t
LEFT JOIN projects p ON t.project_association = p.id
LEFT JOIN messaging_users mu_mentor ON mu_mentor.user_id = t.mentor_id
LEFT JOIN student_teams st ON st.team_id = t.id
LEFT JOIN messaging_users mu_student ON mu_student.user_id = st.student_id
WHERE t.id = $1
GROUP BY t.id, p.id, mu_mentor.name;

`;


        const result = await queryDatabase(query, [id]);

        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }
console.log("fetched team by id is", result)
        return res.json({
            message: 'Fetched successfully',
            result: result
        });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router

