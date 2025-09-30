const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');
const xss = require("xss"); 

router.post('/', async (req, res) => {
    console.log("Creating daily task");
    const user_id = req.user.id
    console.log("req.body is", req.body);

    if(!user_id) {
        console.log("Your session has expired. Please Login again.")
        res.status(401).json({ error: 'Your session has expired. Please Login again.' });
    }

    try {
        const { title, status } = req.body;

        if (typeof title !== "string" || title.trim().length === 0) {
            return res.status(400).json({ error: "Invalid title" });
        }
        if (!["pending", "completed", "in_progress"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        title = xss(title.trim());

        const query = `
            INSERT INTO daily_tasks (title, status, user_id)
            VALUES ($1, $2, $3) RETURNING id, title, status, created_at;
        `;
        const values = [title, status, user_id];

        const taskResult = await queryDatabase(query, values);

         if (!taskResult || taskResult.length === 0) {
            return res.status(500).json({ error: "Task creation failed" });
        }
        
        const task = taskResult[0]

        res.status(201).json({ message: 'Daily task created successfully', task });

    } catch (error) {
        res.status(500).json({ error: 'Error creating daily task' });
    }
}

);

module.exports = router;
