
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting Teams")
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const mentor_id = newReq.userId;
    console.log("mentorid", mentor_id)
    try {
const query = `
   SELECT
    t.id,
    t.name,
    t.description,
    t.created_at,
    t.updated_at,
    t.mentor_id,
    mu.name AS mentor_name,
    t.project_association,
    COALESCE(p.name, '') AS project_name,
    (
      SELECT COUNT(*)
      FROM student_teams st
      WHERE st.team_id = t.id
    ) AS member_count
  FROM
    teams t
  LEFT JOIN messaging_users mu ON t.mentor_id = mu.user_id
  LEFT JOIN projects p ON t.project_association = p.id
  WHERE t.mentor_id = $1
`;


        const values = [mentor_id];

        const result = await queryDatabase(query, values);
        const teams = result;
console.log("teams are", teams)
        return res.json({
            message: 'fetched',
            result: teams
        })
    } catch(error) {
        logger.warn('Invalid user', { mentor_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

