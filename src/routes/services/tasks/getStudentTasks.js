
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes getting student Tasks")
    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const student_id = newReq.userId;
    console.log("mentorid", student_id)
    try {
        const query = `
      SELECT 
  t.id,
  t.title,
  t.description,
  t.due_date,
  t.status,
  t.priority,
  COUNT(st_all.student_id) AS assigned_student_count
FROM student_tasks st
JOIN tasks t ON st.task_id = t.id
JOIN student_tasks st_all ON st_all.task_id = t.id  -- Get all students for each task
WHERE st.student_id = $1
GROUP BY t.id, t.title, t.description, t.due_date, t.status, t.priority;


        `;
        const values = [student_id];

        const result = await queryDatabase(query, values);
        const tasks = result;
        console.log("tasks are thesse", tasks)
        return res.json({
            message: 'fetched',
            result: tasks
        })
    } catch(error) {
        res.status(401).json({ error: 'Invalid user' });
    }
})

module.exports = router

