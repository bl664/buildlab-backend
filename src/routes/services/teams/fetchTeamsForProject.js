
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting Teams for student")
    let newReq = JSON.stringify(req.user, null, 2);
    newReq = JSON.parse(newReq);
    const student_id = newReq.userId;
    console.log("student_id", student_id)
    try {
        const query = `
SELECT
  t.id AS id,
  t.name,
  t.description,
  t.mentor_id,
  mu.name AS mentor_name,
  COUNT(st2.student_id) AS student_count
FROM student_teams st
JOIN teams t ON st.team_id = t.id
LEFT JOIN messaging_users mu ON t.mentor_id = mu.user_id
LEFT JOIN student_teams st2 ON t.id = st2.team_id
WHERE st.student_id = $1
GROUP BY t.id, t.name, t.description, t.mentor_id, mu.name;

        `;
        const values = [student_id];

        const result = await queryDatabase(query, values);
        const teams = result;
console.log("teams for projects are", teams)
        return res.json({
            message: 'fetched',
            result: teams
        })
    } catch(error) {
        logger.warn('Invalid user', { student_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

