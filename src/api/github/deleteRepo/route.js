
async function deleteGitHubRepo(username, repoName, token) {
    console.log('Deleting GitHub repository:', username, repoName, token);
    try {
        const url = `https://api.github.com/repos/${username}/${repoName}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (response.status === 204) {
            console.log('GitHub repository deleted successfully');
            return { success: true };
        } else {
            const errorData = await response.json();
            console.error('Error deleting GitHub repository:', errorData.message);
            return { success: false, error: errorData.message };
        }
    } catch (error) {
        console.error('Error during GitHub repository deletion:', error);
        return { success: false, error: 'Failed to delete GitHub repository' };
    }
}

module.exports = { deleteGitHubRepo };
