const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const jwt = require('jsonwebtoken');
const { updateGitHubRepoName } = require('../../../api/github/updateRepo/route');
const { sendAndStoreNotification } = require('../../../utils/notificationService');

router.use(authMiddleware);

router.put('/', async (req, res) => {
    console.log("yes project update");
    const io = req.app.get('io');

    try {
        const decoded = jwt.verify(req.cookies.bl_auth, APP_CONFIG.BL_AUTH_SECRET_KEY);
        const user_id = decoded.userId;
        console.log("mentor", user_id);

        const { id, updates } = req.body;
        console.log("update req.body", req.body);
        if (!id || !updates || typeof updates !== 'object') {
            console.log("Invalid ID or updates object")
            return res.status(400).json({ error: 'Invalid ID or updates object' });
        }

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

        const accessResult = await queryDatabase(accessCheckQuery, [id, user_id]);
        console.log("access result", accessResult)
        if (accessResult.length === 0) {
            return res.status(403).json({ error: 'Unauthorized: Access denied to update this project' });
        }
        console.log("access granted to update project")
        const { name, description, status, start_date, end_date, tech_stack, skills_required } = updates;

        // 1. Fetch current project details
        const currentProjectQuery = 'SELECT name, github_repo_name, github_repo_url FROM projects WHERE id = $1';
        const currentProjectResult = await queryDatabase(currentProjectQuery, [id]);

        if (currentProjectResult.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        console.log("currentProjectResult", currentProjectResult)
        const currentProjectName = currentProjectResult[0].name;
        const currentRepoName = currentProjectResult[0].github_repo_name;
        const newRepoName = name;

        let updatedGitHubFields = {
            github_repo_name: currentRepoName,
            github_repo_url: currentProjectResult[0].github_repo_url
        };
        console.log("currentProjectName !== name", currentProjectName, name, currentProjectName !== name)
        // 2. Update GitHub repository name if changed
        if (currentProjectName !== name) {
            const updateRepoResponse = await updateGitHubRepoName(currentRepoName, newRepoName, user_id);

            if (!updateRepoResponse || !updateRepoResponse?.github_repo_name || !updateRepoResponse?.github_repo_url) {
                console.error('Failed to update GitHub repository name');
                return res.status(500).json({ error: 'Failed to update GitHub repository name' });
            }

            updatedGitHubFields = {
                github_repo_name: updateRepoResponse?.github_repo_name,
                github_repo_url: updateRepoResponse?.github_repo_url
            };

        } else {
            console.log("GitHub repository name unchanged, skipping update.");
        }

        // 3. Update project in the database
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
                github_repo_url = $9
            WHERE id = $10
            RETURNING *;
        `;

        const values = [
            name,
            description,
            status,
            start_date,
            end_date,
            tech_stack,
            skills_required,
            updatedGitHubFields.github_repo_name,
            updatedGitHubFields.github_repo_url,
            id,

        ];

        const result = await queryDatabase(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found after update' });
        }

        // 4. Sync student_projects
        const { students: updatedStudentIds } = updates;

        // 4a. Get existing student IDs for the project
        const existingStudentRows = await queryDatabase(
            'SELECT student_id FROM student_projects WHERE project_id = $1',
            [id]
        );
        const existingStudentIds = existingStudentRows.map(row => row.student_id);

        // 4b. Determine students to add and remove
        const updatedSet = new Set(updatedStudentIds);
        const existingSet = new Set(existingStudentIds);

        const toAdd = updatedStudentIds.filter(studentId => !existingSet.has(studentId));
        const toRemove = existingStudentIds.filter(studentId => !updatedSet.has(studentId));

        // 4c. Remove unassigned students
        if (toRemove.length > 0) {
            await queryDatabase(
                `DELETE FROM student_projects WHERE project_id = $1 AND student_id = ANY($2::uuid[])`,
                [id, toRemove]
            );
        }

        // 4d. Add new students
        for (const studentId of toAdd) {
            await queryDatabase(
                `INSERT INTO student_projects (project_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [id, studentId.user_id]
            );
        }

        const sendNotification = updatedStudentIds.map(async (student) => {
            console.log("sending notification to", student.user_id)
            await sendAndStoreNotification(io, student.user_id, {
                    type: 'project_updated',
                    content: `project ${name} has been updated by ${user_id}`,
                    url: `/projects/${id}`
                });
            })

        return res.json({
            message: 'Project updated successfully',
            project: result[0]
        });

    } catch (error) {
        console.error('Error updating project:', error.message);
        logger.warn('Invalid update attempt', { error: error.message });
        queryDatabase('ROLLBACK');
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;
