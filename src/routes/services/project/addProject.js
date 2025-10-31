const express = require('express');
const router = express.Router();
const { createGitHubRepo } = require('../../../../src/api/github/createRepo/route');
const { deleteGitHubRepo } = require('../../../../src/api/github/deleteRepo/route');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { checkProjectExistence } = require('./projectExistannce');
const { checkRepoExists } = require('../../../../src/api/github/createRepo/checkRepoExists');
const { sendAndStoreNotification } = require('../../../utils/notificationService');


router.post('/', async (req, res) => {
    const user_id = req.user.id;

    if (!user_id) {
        return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
    }

    let client = null;
    let repoCreated = false;
    let repoName = null;
    const io = req.app.get('io');

    try {
        const { name, description, status, end_date, createdById, teamMembers, techStack, skillsRequired, mentorData } = req.body.projectData;
        const user = req.body.user
        const start_date = req.body.start_date || new Date().toISOString().split('T')[0];
        const mentorId = mentorData || user_id;

        // Validate required fields
        if (!name || !description || !status || !end_date) {
            return res.status(400).json({
                error: 'Missing required project fields',
                details: 'Name, description, status, and end_date are required'
            });
        }

        // Validate team members array
        if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
            return res.status(400).json({
                error: 'Team members are required',
                details: 'At least one team member must be specified'
            });
        }

        // Step 1: Check if project already exists
        const projectCheck = await checkProjectExistence(name, user_id);
        if (projectCheck.exists) {
            return res.status(409).json({
                error: 'Project already exists',
                details: projectCheck.message
            });
        }

        // Step 2: Get GitHub token
        const tokenResult = await queryDatabase(
            'SELECT github_token, github_user_name FROM github_users WHERE user_id = $1',
            [user_id]
        );

        if (!tokenResult || tokenResult.length === 0) {
            console.log('GitHub account not connected');
            return res.status(400).json({
                error: 'GitHub account not Linked. Please connect your GitHub account first.',
                details: 'Please connect your GitHub account first'
            });
        }

        const { github_token, github_user_name } = tokenResult[0];

        if (!github_token) {
            return res.status(400).json({
                error: 'GitHub token not found',
                details: 'Please reconnect your GitHub account'
            });
        }

        // Step 3: Check if GitHub repo already exists
        const repoCheck = await checkRepoExists(github_user_name, name, github_token);
        if (repoCheck) {
            console.log('GitHub repository already exists');
            return res.status(409).json({
                error: 'GitHub repository already exists',
                details: `Repository '${name}' already exists in your GitHub account`
            });
        }


        // Step 4: Create GitHub repository
        const repoResponse = await createGitHubRepo(name, description, github_token);

        // Check if the response is ok
        if (!repoResponse.ok) {
            const errorData = await repoResponse.json();
            console.error('GitHub repository creation failed:', errorData);

            return res.status(repoResponse.status).json({
                error: 'Failed to create GitHub repository',
                details: errorData.error || errorData.message || 'Unknown GitHub API error',
                validation_errors: errorData.details || null
            });
        }

        const repoData = await repoResponse.json();
        repoCreated = true;
        repoName = repoData.repoName;


        // Step 5: Start database transaction
        client = await getTransactionClient();

        try {
            // Insert project into database
            const projectQuery = `
               INSERT INTO projects 
                (name, description, status, start_date, end_date, created_by_id, updated_by_id, tech_stack, skills_required, github_repo_url, github_repo_name)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9::text[], $10, $11)
                RETURNING id;
            `;

            const projectValues = [
                name, description, status, start_date, end_date,
                user_id, user_id, techStack, skillsRequired,
                repoData.repoUrl, repoData.repoName
            ];

            const projectResult = await queryDatabase(projectQuery, projectValues, client);

            if (!projectResult || projectResult.length === 0) {
                throw new Error('Failed to create project in database');
            }
            const projectId = projectResult[0].id;

            // Step 6: Create mentor-project relation (PASS CLIENT!)
            await queryDatabase(
                'INSERT INTO mentor_projects (project_id, mentor_id) VALUES ($1, $2)',
                [projectId, mentorId],
                client  // ← This is the key fix!
            );

            // Step 7: Create student-project relations (PASS CLIENT!)
            const studentInsertPromises = teamMembers.map((student) => {
                const studentId = student.id || student;
                if (!studentId) {
                    throw new Error('Invalid student ID in team members');
                }
                return queryDatabase(
                    'INSERT INTO student_projects (project_id, student_id) VALUES ($1, $2)',
                    [projectId, studentId],
                    client  // ← This is also the key fix!
                );
            });

            await Promise.all(studentInsertPromises);

            if (user === 'student') {
                const mentor_id = mentorId;
                await sendAndStoreNotification(io, mentor_id, {
                    type: 'New Project Created',
                    content: `Project ${name} has been Created and Pending for you approval.`,
                    createdBy: user_id,
                    url: `/projects/${projectId}`
                });
            }
            else if (user === 'mentor') {
                const sendNotification = teamMembers.map(async (student) => {
                    const studentId = student.id || student;
                    await sendAndStoreNotification(io, studentId, {
                        type: 'New Project Created',
                        content: `Project ${name} has been Created and assigned to you.`,
                        createdBy: mentorId,
                        url: `/projects/${projectId}`
                    });
                })
            }

            // Commit transaction
            await client.query('COMMIT');

            const payload = {
                id: projectId,
                name: name,
                description: description,
                status: status,
                end_date: end_date,
                assignee: teamMembers?.length
            }
            // Success response
            return res.status(201).json({
                success: true,
                message: 'Project created successfully',
                data: {
                    project: payload,
                    repoUrl: repoData.repoUrl,
                    repoName: repoData.repoName
                }
            });

        } catch (dbError) {
            // Rollback database transaction
            await client.query('ROLLBACK');
            console.error('Database error, transaction rolled back:', dbError);
            if (dbError.code === '23505') { // PostgreSQL unique constraint violation
                if (dbError.constraint === 'projects_name_key') {
                    throw new Error(`DUPLICATE_PROJECT_NAME: A project with the name '${name}' already exists. Please choose a different name.`);
                } else {
                    throw new Error(`DUPLICATE_ENTRY: This ${dbError.constraint} already exists.`);
                }
            }

            // Handle foreign key constraint violations
            if (dbError.code === '23503') { // PostgreSQL foreign key violation
                throw new Error('INVALID_REFERENCE: One or more referenced records do not exist.');
            }

            // Handle other database errors
            if (dbError.code) {
                throw new Error(`DATABASE_ERROR: ${dbError.message}`);
            }

            throw dbError; // Re-throw if not handled above
        } finally {
            // Always release the client
            if (client) {
                client.release();
            }
        }

    } catch (error) {
        console.error('Error in project creation:', error);
        // Cleanup: Delete GitHub repo if it was created but database failed
        if (repoCreated && repoName) {
            try {
                console.log('Attempting to cleanup GitHub repository...');
                const tokenResult = await queryDatabase(
                    'SELECT github_token, github_user_name FROM github_users WHERE user_id = $1',
                    [user_id]
                );

                if (tokenResult && tokenResult.length > 0) {
                    const { github_token, github_user_name } = tokenResult[0];
                    if (github_token) {
                        await deleteGitHubRepo(github_user_name, repoName, github_token);
                        console.log('GitHub repository cleaned up successfully');
                    }
                }
            } catch (cleanupError) {
                console.error('Failed to cleanup GitHub repository:', cleanupError);
                // Don't throw cleanup error, just log it
            }
        }
        // Determine error status and message
        let statusCode = 500;
        let errorMessage = 'Internal server error';
        let errorDetails = error.message;

        if (error.message.includes('DUPLICATE_PROJECT_NAME:')) {
            statusCode = 409;
            errorMessage = 'Project name already exists';
            errorDetails = error.message.replace('DUPLICATE_PROJECT_NAME: ', '');
        } else if (error.message.includes('DUPLICATE_ENTRY:')) {
            statusCode = 409;
            errorMessage = 'Duplicate entry';
            errorDetails = error.message.replace('DUPLICATE_ENTRY: ', '');
        } else if (error.message.includes('INVALID_REFERENCE:')) {
            statusCode = 400;
            errorMessage = 'Invalid reference';
            errorDetails = error.message.replace('INVALID_REFERENCE: ', '');
        } else if (error.message.includes('DATABASE_ERROR:')) {
            statusCode = 500;
            errorMessage = 'Database error';
            errorDetails = error.message.replace('DATABASE_ERROR: ', '');
        } else if (error.message.includes('GitHub')) {
            statusCode = 502;
            errorMessage = 'GitHub service error';
        } else if (error.message.includes('database')) {
            statusCode = 500;
            errorMessage = 'Database error';
        } else if (error.message.includes('validation')) {
            statusCode = 400;
            errorMessage = 'Validation error';
        }

        return res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: errorDetails
        });
    }
});

module.exports = router;