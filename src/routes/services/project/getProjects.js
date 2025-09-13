
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getBasicProjectDetail")
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);

    let user_id = decoded.userId
    console.log("mentor", user_id)
    try {
        const query = `
  SELECT * 
  FROM projects 
  WHERE id IN (
      SELECT project_id 
      FROM mentor_projects 
      WHERE mentor_id = $1
  );
`;
        const values = [user_id];

        const result = await queryDatabase(query, values);
        const projects = result;
// console.log("projects are", projects)
        return res.json({
            message: 'fetched',
            projects: projects
        })
    } catch(error) {
        logger.warn('Invalid user', { user_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

