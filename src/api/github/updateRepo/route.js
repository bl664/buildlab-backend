const { queryDatabase } = require('../../../services/dbQuery');
const { checkRepoExists } = require('../../../../src/api/github/createRepo/checkRepoExists');

async function updateGitHubRepoName(currentRepoName, newRepoName, user_id) {
    try {
        if (!currentRepoName || !newRepoName) {
            throw new Error('Both current and new repository names are required.');
        }

        const tokenResult = await queryDatabase(
            'SELECT github_token, github_user_name FROM github_users WHERE user_id = $1',
            [user_id]
        );
        if (tokenResult.length === 0) {
            throw new Error('GitHub token or username not found for this user.');
        }

        const { github_token, github_user_name } = tokenResult[0];

        const repoCheck = await checkRepoExists(github_user_name, currentRepoName, github_token);
        if (!repoCheck) {
            throw new Error(`Repository "${currentRepoName}" does not exist.`);
        }
        console.log("yes repo exists")

        const response = await fetch(`https://api.github.com/repos/${github_user_name}/${currentRepoName}`, {
            method: 'PATCH',
            headers: {
                Authorization: `token ${github_token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newRepoName }),
        });

        const data = await response.json();
        if (response.status !== 200) {
            console.error('error Failed to update GitHub repository name');
            throw new Error(data.message || 'Failed to update GitHub repository name.');
        }
        return {
            message: 'Repository name updated successfully',
            github_repo_name: data.name,
            github_repo_url: data.html_url,
        };
    } catch (error) {
        console.error('Error in updateGitHubRepoName:', error.message);
        throw error;
    }
}

module.exports = { updateGitHubRepoName };
