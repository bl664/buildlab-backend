const express = require('express');
const router = express.Router();
const APP_CONFIG = require('../../../../config')

router.get('/', (req, res) => {
  
  const userId = req.query.userId;
  const role = req.query.role;
console.log("creating user...", userId, role)
  if (!userId) {
    console.log("missing user Id")
    return res.status(400).send('Missing userId');
  }

  const state = JSON.stringify({ userId, role });

  const params = new URLSearchParams({
    client_id: APP_CONFIG.GITHUB_CLIENT_ID,
    redirect_uri: `${APP_CONFIG.GITHUB_REDIRECT_URL}/api/auth/github/callback`,
    scope: 'read:user user:email repo delete_repo',
    state,
  });

  const clientID = APP_CONFIG.GITHUB_CLIENT_ID;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.redirect(githubAuthUrl);
});

module.exports = router;