const { queryDatabase } = require('../../../services/dbQuery');

async function saveGithubUserInfo(data, userId, githubToken) {
  console.log("saving github user");

  try {
    const { id, login, avatar_url, html_url, type, site_admin, public_repos, public_gists,
      followers, following, created_at, updated_at } = data;

    console.log("creating user with data ", id, login, avatar_url, html_url, type, site_admin, public_repos, public_gists,
      followers, following, created_at, updated_at, userId, githubToken);

    // First, check if github_id already exists and belongs to a different user
    const existingUser = await queryDatabase(`
      SELECT user_id, github_user_name 
      FROM github_users 
      WHERE github_id = $1
    `, [id]);

    if (existingUser.length > 0) {
      const existingUserId = existingUser[0].user_id;
      
      // If github_id exists but belongs to a different user
      if (existingUserId !== userId) {

        return {
          success: false,
          error: 'GITHUB_ID_ALREADY_LINKED',
          message: `This GitHub account is already linked with another user.`,
        };
      }
    }

    // Proceed with insert/update
    const result = await queryDatabase(`
      INSERT INTO github_users (
        user_id, github_id, github_user_name, avatar_url, html_url, type, site_admin,
        public_repos, public_gists, followers, following,
        created_at_github, updated_at_github, github_token
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14
      )
      ON CONFLICT (github_id) DO UPDATE
      SET
        github_user_name = EXCLUDED.github_user_name,
        avatar_url = EXCLUDED.avatar_url,
        html_url = EXCLUDED.html_url,
        type = EXCLUDED.type,
        site_admin = EXCLUDED.site_admin,
        public_repos = EXCLUDED.public_repos,
        public_gists = EXCLUDED.public_gists,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,
        updated_at_github = EXCLUDED.updated_at_github,
        github_token = EXCLUDED.github_token,
        updated_at = NOW()
      WHERE github_users.user_id = EXCLUDED.user_id
      RETURNING *;
    `, [
      userId,
      id,
      login,
      avatar_url,
      html_url,
      type,
      site_admin,
      public_repos,
      public_gists,
      followers,
      following,
      created_at,
      updated_at,
      githubToken
    ]);

    if (result && result.length > 0) {
      return {
        success: true,
        message: "Your GitHub Info is updated successfully",
        data: result[0]
      };
    } else {
      return {
        success: false,
        error: 'NO_ROWS_AFFECTED',
        message: "Failed to insert or update GitHub user information"
      };
    }

  } catch (error) {
    console.error('Error saving GitHub user info:', error);
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: "An error occurred while saving GitHub user information",
      details: error.message
    };
  }
}

module.exports = saveGithubUserInfo;