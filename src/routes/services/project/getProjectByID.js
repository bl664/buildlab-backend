
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
  console.log("yes getProjectByID")
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Invalid ID.Unable to find project' });
  }
  let client;
  try {
    client = await getTransactionClient();
;

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

    const result = await queryDatabase(query, values, client);
    await client.query('COMMIT');

    const project = result;
    return res.json({
      message: 'fetched',
      project: project
    })
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
})

module.exports = router

