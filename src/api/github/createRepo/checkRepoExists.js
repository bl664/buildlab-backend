async function checkRepoExists(owner, repoName, token) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      method: 'GET',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  
    return response.status === 200;
}

module.exports = { checkRepoExists };