
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
router.use(authMiddleware);
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    console.log("yes get Tasks");

    let newReq = JSON.stringify(req.user, null, 2);
    console.log("req is", newReq);

    newReq = JSON.parse(newReq);
    const mentor_id = newReq.userId;
    console.log("mentorid", mentor_id);

    try {
        const query = `
        SELECT
            t.id,
            t.title,
            t.description,
            t.due_date,
            t.status,
            t.priority,
            (
                SELECT COUNT(*)
                FROM student_tasks st
                WHERE st.task_id = t.id
            ) AS assigned_student_count
        FROM tasks t
        WHERE t.id IN (
            SELECT task_id
            FROM mentor_tasks
            WHERE mentor_id = $1
        );
        `
        const values = [mentor_id];
        const result = await queryDatabase(query, values);
        // console.log("task result", result)
        return res.json({
            message: 'fetched',
            result: result
        });

    } catch (error) {
        logger.warn('Invalid user', { mentor_id });
        res.status(401).json({ error: 'Invalid user' });
    }
});


module.exports = router

