const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { updateGitHubRepoName } = require('../../../api/github/updateRepo/route');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.put('/', async (req, res) => {
    console.log("yes project update");

    const user_id = req.user.id;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    const io = req.app.get('io');

    try {
        const { id, updates } = req.body;

        if (!id || !updates || typeof updates !== 'object') {
            console.log("Invalid ID or updates object")
            return res.status(400).json({ error: 'Invalid ID or updates object' });
        }

        const { name, description, status, start_date, end_date, tech_stack, skills_required } = updates;

        const { students: updatedStudentIds } = updates;

        if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
            return res.status(400).json({ error: 'Invalid project name' });
        }

        if (!Array.isArray(updatedStudentIds)) {
            return res.status(400).json({ error: 'students must be an array' });
        }

        let client = await getTransactionClient();

        // Fetch project creator and assigned students
        const accessCheckQuery = `
            SELECT 1
            FROM projects p
            WHERE p.id = $1
            AND (
                EXISTS (
                SELECT 1 FROM mentor_projects mp
                WHERE mp.project_id = p.id AND mp.mentor_id = $2
                )
                OR
                EXISTS (
                SELECT 1 FROM student_projects sp
                WHERE sp.project_id = p.id AND sp.student_id = $2
                )
            )
            LIMIT 1;
            `;

        const accessResult = await queryDatabase(accessCheckQuery, [id, user_id], client);

        if (!accessResult || accessResult.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(403).json({ error: 'Unauthorized: Access denied to update this project' });
        }

        try {
            const currentProjectQuery = 'SELECT name, github_repo_name, github_repo_url FROM projects WHERE id = $1';
            const currentProjectResult = await queryDatabase(currentProjectQuery, [id], client);

            if (currentProjectResult.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Project not found' });
            }

            const currentProjectName = currentProjectResult[0].name;
            const currentRepoName = currentProjectResult[0].github_repo_name;
            const newRepoName = name;

            let updatedGitHubFields = {
                github_repo_name: currentRepoName,
                github_repo_url: currentProjectResult[0].github_repo_url
            };

            if (name && name.trim() !== currentProjectName) {
                const updateRepoResponse = await updateGitHubRepoName(currentRepoName, newRepoName, user_id);

                if (!updateRepoResponse || !updateRepoResponse?.github_repo_name || !updateRepoResponse?.github_repo_url) {
                    await client.query('ROLLBACK');
                    client.release();

                    console.error('Failed to update GitHub repository name');
                    return res.status(500).json({ error: 'Failed to update GitHub repository name' });
                }

                updatedGitHubFields = {
                    github_repo_name: updateRepoResponse?.github_repo_name,
                    github_repo_url: updateRepoResponse?.github_repo_url
                };
            }

            const newName = name !== undefined ? name.trim() : currentProjectName;
            const newDescription = description !== undefined ? description : null;
            const newStatus = status !== undefined ? status : null;
            const newStart = start_date !== undefined ? start_date : null;
            const newEnd = end_date !== undefined ? end_date : null;
            const newTechStack = tech_stack !== undefined ? tech_stack : null;
            const newSkillsRequired = skills_required !== undefined ? skills_required : null;

            const updateQuery = `
            UPDATE projects
            SET name = $1,
                description = $2,
                status = $3,
                start_date = $4,
                end_date = $5,
                tech_stack = $6,
                skills_required = $7,
                github_repo_name = $8,
                github_repo_url = $9,
                updated_by_id = $10,
                updated_at = now()
            WHERE id = $11
            RETURNING *;
        `;

            const updateValues = [
                newName,
                newDescription,
                newStatus,
                newStart,
                newEnd,
                newTechStack,
                newSkillsRequired,
                updatedGitHubFields.github_repo_name,
                updatedGitHubFields.github_repo_url,
                user_id,
                id
            ];

            const updateResult = await queryDatabase(updateQuery, updateValues, client);

            if (!updateResult || updateResult.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json({ error: 'Project not found after update' });
            }

            const updatedProject = updateResult[0];

            const existingStudentRows = await queryDatabase('SELECT student_id FROM student_projects WHERE project_id = $1', [id], client);

            const existingStudentIds = existingStudentRows.map(row => row.student_id);

            const normalizedUpdatedIds = updatedStudentIds.map(s => {
                if (!s) return null;
                if (typeof s === 'object') return s.user_id || s.id || null;
                return s;
            }).filter(Boolean);

            const updatedSet = new Set(updatedStudentIds);
            const existingSet = new Set(existingStudentIds);


            console.log("updateset", updatedSet)
            console.log("existing set", existingSet)

            const toAdd = normalizedUpdatedIds.filter(student => !existingSet.has(student.user_id));
            const toRemove = existingStudentIds.filter(sid => !updatedSet.has(sid));
            
            console.log("to add", toAdd)
            console.log("to remove", toRemove)
            
            if (toRemove.length > 0) {
                await queryDatabase(
                    `DELETE FROM student_projects WHERE project_id = $1 AND student_id = ANY($2::uuid[])`,
                    [id, toRemove], client
                );
            }

            for (const studentId of toAdd) {
                console.log("to add student id", studentId)
                await queryDatabase(
                    `INSERT INTO student_projects (project_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [id, studentId], client
                );
            }

            try {
                const notificationPromises = normalizedUpdatedIds.map(async (student) => {
                    console.log("student is ", student)
                    try {
                        await sendAndStoreNotification(io, student, {
                            type: 'project_updated',
                            content: `project ${name} has been updated by ${user_id}`,
                            url: `/projects/${id}`
                        });
                    } catch (notifyErr) {
                        console.warn('Notification failed for student', studentId, notifyErr && notifyErr.message);
                    }
                })
                await Promise.all(notificationPromises);
            } catch (notifyErr) {
            }
            await client.query('COMMIT');
            client.release();

            return res.json({
                message: 'Project updated successfully',
                project: updatedProject
            });
        } catch (txErr) {
            try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
            client.release();

            console.error('Transaction error while updating project:', txErr);
            return res.status(500).json({ error: 'Failed to update project', details: txErr.message });

        }

        // const toAdd = updatedStudentIds.filter(studentId => !existingSet.has(studentId));
        // const toRemove = existingStudentIds.filter(studentId => !updatedSet.has(studentId));

    } catch (error) {
        console.error('Error updating project:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;
