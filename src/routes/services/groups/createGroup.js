const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const {
    queryDatabase,
    getTransactionClient,
    commitTransaction,
    rollbackTransaction
} = require('../../../services/dbQuery');
//router.use(authMiddleware);

router.post('/', async (req, res) => {
    console.log("yes create group")
    const mentor_id = req.user.id;
    console.log("mentorid", mentor_id)

    const client = await getTransactionClient();

    try {
        const { title, description, status, max_members, tags } = req.body.groupData;
        console.log("req,body group", req.body.groupData)
        const groupCreateQuery = `
            INSERT INTO student_groups (title, description, status, mentor_id, max_members, tags)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
        `;
        const groupCreateValues = [title, description, status, mentor_id, max_members, tags];

        const groupCreateResult = await queryDatabase(groupCreateQuery, groupCreateValues, client);

        const groupId = groupCreateResult[0].id;
        await commitTransaction(client);

        console.log("Group created successfully", groupId)
        res.status(201).json({ message: 'Group created successfully', groupId });

    } catch (error) {
        await rollbackTransaction(client);
        console.error(error);
        res.status(500).json({ error: 'Error creating group' });
    }
});
module.exports = router;