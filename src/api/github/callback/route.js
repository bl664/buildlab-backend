const express = require('express');
const router = express.Router();
const axios = require('axios');
const APP_CONFIG = require('../../../../config')
const getGitHubUser = require('../githubUserInfo/route')
const saveGithubUserInfo = require('../createUser.js/route')

router.get('/', async (req, res) => {
  console.log("getting callback........................", req.query.state)


let state;
try {
  state = JSON.parse(req.query.state);
} catch (e) {
  console.error("Failed to parse state:", req.query.state);
  return res.status(400).json({ error: 'Invalid state format' });
}
const code = req.query.code
const userId = state.userId;
const role = state.role;


  console.log("role is ", role, code, userId)

  if (!code || !userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing code or state parameter'
    });
  }

  try {
    console.log("code is ", code, userId)

    // Get access token from GitHub
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: APP_CONFIG.GITHUB_CLIENT_ID,
        client_secret: APP_CONFIG.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error("No access token received from GitHub");
      return res.status(400).json({
        success: false,
        error: 'Failed to obtain access token from GitHub'
      });
    }

    // Get user info from GitHub
    const userInfo = await getGitHubUser(accessToken);

    if (!userInfo) {
      console.error("Failed to get user info from GitHub");
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch user information from GitHub'
      });
    }

    console.log("Access token:", accessToken, "User info:", userInfo);

    // Save/update GitHub user info
    const saveResult = await saveGithubUserInfo(userInfo, userId, accessToken);
    console.log("Save result:", saveResult);

    if (!saveResult || !saveResult.success) {
      console.error("⚠️ User not inserted/updated in github_users!", saveResult);
      const ERROR_CODES = {
        'GITHUB_ID_ALREADY_LINKED': 'GITHUB_ACCOUNT_ALREADY_LINKED',
        'NETWORK_ERROR': 'CONNECTION_FAILED',
        'GITHUB_API_ERROR': 'GITHUB_API_FAILED',
        'INTERNAL_SERVER_ERROR': 'UNEXPECTED_ERROR'
      };

      // Handle specific error cases
      if (saveResult && saveResult.error === 'GITHUB_ID_ALREADY_LINKED') {
        if (role === 'student') {
          return res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);

        } else if (role === 'mentor') {
          return res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);
        }
      }
      if (role === 'student') {
        return res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);

      } else if (role === 'mentor') {
        return res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);
      }

    }

    console.log("GitHub user saved successfully:", saveResult);
    if (role === 'student') {
      res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_success=true&message=${encodeURIComponent(saveResult.message)}`);

    } else if (role === 'mentor') {
      res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_success=true&message=${encodeURIComponent(saveResult.message)}`);

    }


  } catch (err) {
    console.error('GitHub callback error:', err);

    let errorCode = 'UNEXPECTED_ERROR';

    if (err.response) {
      errorCode = 'GITHUB_API_FAILED';
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      errorCode = 'CONNECTION_FAILED';
    }

    if (role === 'student') {
      return res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${errorCode}`);

    } else if (role === 'mentor') {
      return res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${errorCode}`);

    }



  }
});

module.exports = router;