
const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');

router.get('/', async (req, res) => {
    console.log("yes getting student Tasks")

    const student_id = req.user.id
     if (!student_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }
    let client;

    try {
        client = await getTransactionClient();
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

        const result = await queryDatabase(query, values, client);
                await commitTransaction(client);

        const tasks = result;
        console.log("tasks are thesse", tasks)
        return res.json({
            message: 'fetched',
            result: tasks
        })
    } catch (error) {
        if (client) await rollbackTransaction(client);
        console.error('Error fetching tasks for student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

module.exports = router

