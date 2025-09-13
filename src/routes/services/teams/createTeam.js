const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);

router.post('/', async (req, res) => {
    console.log("yes create team")
    let newReq = JSON.stringify(req.user, null, 2);

    newReq = JSON.parse(newReq);
    const mentor_id = newReq.userId;
    console.log("mentorid", mentor_id)
    const io = req.app.get('io');
    try {
        const { teamName, projectAssociation, members, teamDescription } = req.body.teamData;

        const {  team_lead, designer, developer, qa } = req.body.teamData.rolesData;

        console.log("req,body", req.body.teamData)
        const formattedMembers = `{${members.join(',')}}`;

        const query = `
            INSERT INTO teams (name, description, project_association, mentor_id)
            VALUES ($1, $2, $3, $4) RETURNING id;
        `;
        
        const values = [teamName,teamDescription,  projectAssociation, mentor_id];
        const teamResult = await queryDatabase(query, values);
console.log("teamResult.rows[0]", teamResult.length)
        const teamId = teamResult[0].id;
console.log("inserting into student")
        const studentTaskInsertQuery = `
            INSERT INTO student_teams (team_id, student_id, role)
            VALUES ($1, $2, $3);
        `;

        // const studentTaskInsertValue = [student_id, task_id, mentor_id, status]

        for (const studentId of members) {
            let role = ''; // Default role

            // Check the role of the student and assign accordingly
            if (team_lead === studentId) {
                role = 'team_lead';
            } else if (designer === studentId) {
                role = 'designer';
            } else if (developer.includes(studentId)) {
                role = 'developer';
            } else if (qa.includes(studentId)) {
                role = 'qa';
            }

            // Insert the student with the assigned role
            await queryDatabase(studentTaskInsertQuery, [teamId, studentId, role]);
        }

        const sendNotification = members.map(async (memberId) => {
            await sendAndStoreNotification(io, memberId, {
                type: 'Team Invite',
                content: `You have been invited to join the team "${teamName}".`,
                createdBy: mentor_id,
                url: `/teams/${teamId}`,
            });
        });

        res.status(201).json({ message: 'Tesk created successfully', teamId });

    } catch(error) {
        await queryDatabase('ROLLBACK'); // Roll back in case of an error
        console.error(error);
        res.status(500).json({ error: 'Error creating team' });
    }
});
module.exports = router;