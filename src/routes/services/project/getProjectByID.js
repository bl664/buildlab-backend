
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getProjectByID")
    const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);
    const { id } = req.query;
    let user_id = decoded.userId
    console.log("mentor", user_id, id)
     
    try {
        const query = `
        SELECT 
  p.id, 
  p.name, 
  p.description,
  p.status, 
  p.start_date,  
  p.end_date, 
  p.created_at, 
  p.tech_stack, 
  p.skills_required, 
  p.github_repo_url, 
  p.github_repo_name,

  json_build_object(
    'id', p.created_by_id,
    'name', mu_creator.name
  ) AS created_by,

  json_build_object(
    'id', mp.mentor_id,
    'name', mu_mentor.name
  ) AS mentor,

  COALESCE(
    json_agg(
      json_build_object(
        'user_id', mu_student.user_id, 
        'name', mu_student.name
      )
    ) FILTER (WHERE mu_student.user_id IS NOT NULL), '[]'
  ) AS students

FROM projects p
LEFT JOIN student_projects sp ON sp.project_id = p.id
LEFT JOIN messaging_users mu_student ON mu_student.user_id = sp.student_id
LEFT JOIN messaging_users mu_creator ON mu_creator.user_id = p.created_by_id
LEFT JOIN mentor_projects mp ON mp.project_id = p.id
LEFT JOIN messaging_users mu_mentor ON mu_mentor.user_id = mp.mentor_id
WHERE p.id = $1
GROUP BY 
  p.id, 
  mu_creator.name, 
  mp.mentor_id, 
  mu_mentor.name;

        `;
        const values = [id];

        const result = await queryDatabase(query, values);
        const project = result;
console.log("project by id is ", project)
        return res.json({
            message: 'fetched',
            project: project
        })
    } catch(error) {
        logger.warn('Invalid user', { user_id });
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

