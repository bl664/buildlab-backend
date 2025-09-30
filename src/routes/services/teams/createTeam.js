const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.post('/', async (req, res) => {
    console.log("yes create team")

    const mentor_id = req.user.id;
    if (!mentor_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const io = req.app.get('io');
    let client;
    try {

        client = await getTransactionClient();
        const { teamName, projectAssociation, members, teamDescription } = req.body.teamData;

        const {  team_lead, designer, developer, qa } = req.body.teamData.rolesData;

        const formattedMembers = `{${members.join(',')}}`;

        const query = `
            INSERT INTO teams (name, description, project_association, mentor_id)
            VALUES ($1, $2, $3, $4) RETURNING id;
        `;
        
        const values = [teamName,teamDescription,  projectAssociation, mentor_id];
        const teamResult = await queryDatabase(query, values, client);
        const teamId = teamResult[0].id;
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
            await queryDatabase(studentTaskInsertQuery, [teamId, studentId, role], client);
        }

        const sendNotification = members.map(async (memberId) => {
            await sendAndStoreNotification(io, memberId, {
                type: 'Team Invite',
                content: `You have been invited to join the team "${teamName}".`,
                createdBy: mentor_id,
                url: `/teams/${teamId}`,
            });
        });

        const fetchMissingDataQuery = `
            SELECT 
                mu.name AS mentor_name,
                COALESCE(p.name, '') AS project_name,
                NOW() AS created_at
            FROM messaging_users mu
            LEFT JOIN projects p ON p.id = $2
            WHERE mu.user_id = $1
        `;

        const missingData = await queryDatabase(fetchMissingDataQuery, [mentor_id, projectAssociation], client);
await commitTransaction(client);
        const teamData = {
            id: teamId,
            name: teamName,
            description: teamDescription,
            created_at: missingData[0].created_at,
            updated_at: missingData[0].created_at, // Same as created_at for new records
            mentor_id: mentor_id,
            mentor_name: missingData[0].mentor_name,
            project_association: projectAssociation,
            project_name: missingData[0].project_name,
            member_count: members.length
        };

        res.status(201).json({ message: 'Tesk created successfully', teamData });

    } catch(error) {
       if (client) await rollbackTransaction(client);
        console.error(error);
        res.status(500).json({ error: 'Error creating team' });
    }
});
module.exports = router;