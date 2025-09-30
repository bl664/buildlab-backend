const express = require('express');
const router = express.Router();
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const jwt = require('jsonwebtoken');
const { deleteGitHubRepo } = require('../../../../src/api/github/deleteRepo/route');

router.delete('/', async (req, res) => {
    console.log("yes deleting project");
    const user_id = req.user.id
let client;
    try {
        const { id, name } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Please try again' });
        }

        client = await getTransactionClient();


         const accessCheckQuery = `
            SELECT p.github_repo_name
            FROM projects p
            WHERE p.id = $1
            AND (
                p.created_by_id = $2
                OR EXISTS (
                    SELECT 1
                    FROM mentor_projects mp
                    WHERE mp.project_id = p.id
                    AND mp.mentor_id = $2
                )
            )
            LIMIT 1;
        `;

        const accessResult = await queryDatabase(accessCheckQuery, [id, user_id], client);


        if (accessResult.length === 0) {
             await client.query('ROLLBACK');
                client.release();
            return res.status(403).json({ error: 'Unauthorized: You cannot delete this project' });
        }

        const  repoName = accessResult[0].github_repo_name;

console.log("repoName", repoName);
        let githubQuery = `SELECT github_token, github_user_name FROM github_users WHERE user_id = $1`;

        const githubResult = await queryDatabase(githubQuery, [user_id], client);

        if (githubResult.length === 0) {
             await client.query('ROLLBACK');
                client.release();
            console.error('GitHub user not found');
         return res.status(404).json({ error: 'GitHub user not found' });
        }
        const { github_token, github_user_name } = githubResult[0];

        const deleteResponse = await deleteGitHubRepo(github_user_name, repoName, github_token)

    if (!deleteResponse.success) {
         await client.query('ROLLBACK');
                client.release();
        console.error('Failed to delete GitHub repository:', deleteResponse);
        return res.status(500).json({ error: deleteResponse.error || 'Failed to delete GitHub repository' });
    }

        const query = `DELETE from projects wHERE id = $1`;
        const values = [id];
        
        const result = await queryDatabase(query, values, client);

        console.log("Deleted project:", result);
        await client.query('COMMIT');
            client.release();

        return res.json({
            message: 'Project deleted successfully',
            project: result
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        await client.query('ROLLBACK');
        client.release();

        res.status(500).json({ error: error });
    }
});

module.exports = router;
