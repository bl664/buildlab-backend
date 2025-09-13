const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const logger = require('../../../utils/logger');
const { queryDatabase } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config');
const jwt = require('jsonwebtoken');
const { deleteGitHubRepo } = require('../../../../src/api/github/deleteRepo/route');
router.use(authMiddleware);

router.delete('/', async (req, res) => {
    console.log("yes deleting project");

    try {
        let newReq = JSON.stringify(req.user, null, 2);
        console.log("req is", newReq);

        newReq = JSON.parse(newReq);
        const user_id = newReq.userId;

        const { id, name } = req.body;
console.log("id is", id, name);
        if (!id) {
            return res.status(400).json({ error: 'Please try again' });
        }

        let github_repo_name = `SELECT github_repo_name FROM projects WHERE id = $1`;

        const githubRepoResult = await queryDatabase(github_repo_name, [id]);
        if (githubRepoResult.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const repoName  = githubRepoResult[0];
console.log("repoName", repoName);
        let githubQuery = `SELECT github_token, github_user_name FROM github_users WHERE user_id = $1`;

        const githubResult = await queryDatabase(githubQuery, [user_id]);

        if (githubResult.length === 0) {
            console.error('GitHub user not found');
         return res.status(404).json({ error: 'GitHub user not found' });
        }
console.log("githubResult", githubResult);
        const { github_token, github_user_name } = githubResult[0];
console.log("github_token", github_token, github_user_name);
        const deleteResponse = await deleteGitHubRepo(github_user_name, repoName.github_repo_name, github_token)
console.log("deleteResponse", deleteResponse);

    if (!deleteResponse.success) {
        console.error('Failed to delete GitHub repository:', deleteResponse.error);
        return res.status(500).json({ error: deleteResponse.error || 'Failed to delete GitHub repository' });
    }

        const query = `DELETE from projects wHERE id = $1`;
        const values = [id];
        
        const result = await queryDatabase(query, values);

        console.log("Deleted project:", result);
        return res.json({
            message: 'Project deleted successfully',
            project: result
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        queryDatabase('ROLLBACK');
        logger.warn('Invalid user', { user_id });
        res.status(500).json({ error: error });
    }
});

module.exports = router;
