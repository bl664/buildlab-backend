
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);

router.get('/', async (req, res) => {
    console.log("yes fetch task by ID")
    const { id } = req.query;

    try {
        console.log("id is ", id, req.query.id)
        const query = `
SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    t.priority,
    t.created_at,
    t.updated_at,

    -- JSON array of students assigned to the task, with their ID and name
    (
        SELECT json_agg(
            json_build_object(
                'student_id', st.student_id,
                'student_name', mu.name
            )
        )
        FROM student_tasks st
        JOIN messaging_users mu ON mu.user_id = st.student_id
        WHERE st.task_id = t.id
    ) AS assigned_to,

    -- Project info
    p.id AS project_id,
    p.name AS project_name,

    -- Mentor info
    mt.mentor_id,
    mu_mentor.name AS mentor_name,

    -- Creator name
    mu_creator.name AS creator_name

FROM tasks t
LEFT JOIN projects p ON p.id = t.project_id

-- Get mentor_id from mentor_tasks
LEFT JOIN mentor_tasks mt ON mt.task_id = t.id

-- Get mentor name from messaging_users
LEFT JOIN messaging_users mu_mentor ON mu_mentor.user_id = mt.mentor_id

-- Get creator name from messaging_users
LEFT JOIN messaging_users mu_creator ON mu_creator.user_id = t.created_by

WHERE t.id = $1;


        `;
        const values = [id];

        const result = await queryDatabase(query, values);
        const task = result;
        console.log("task is",task)
        return res.json({
            message: 'fetched',
            task 
        })
    } catch (error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

