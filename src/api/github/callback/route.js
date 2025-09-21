const express = require('express');
const router = express.Router();
const axios = require('axios');
const APP_CONFIG = require('../../../../config');
const getGitHubUser = require('../githubUserInfo/route');
const saveGithubUserInfo = require('../createUser.js/route');

// Enhanced error handling and logging
const logError = (message, error, context = {}) => {
  console.error(`[GitHub Callback Error] ${message}:`, {
    error: error?.message || error,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

const logInfo = (message, data = {}) => {
  console.log(`[GitHub Callback] ${message}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Error code mappings for consistent error handling
const ERROR_CODES = {
  'GITHUB_ID_ALREADY_LINKED': 'GITHUB_ACCOUNT_ALREADY_LINKED',
  'NETWORK_ERROR': 'CONNECTION_FAILED',
  'GITHUB_API_ERROR': 'GITHUB_API_FAILED',
  'INTERNAL_SERVER_ERROR': 'UNEXPECTED_ERROR',
  'INVALID_STATE': 'INVALID_REQUEST',
  'MISSING_PARAMETERS': 'INVALID_REQUEST',
  'TOKEN_EXCHANGE_FAILED': 'GITHUB_API_FAILED',
  'USER_INFO_FAILED': 'GITHUB_API_FAILED'
};

// Helper function to get redirect URL based on role
const getRedirectUrl = (role) => {
  if (role === 'student') {
    return APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
  } else if (role === 'mentor') {
    return APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
  }
  // Default fallback
  return APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
};

// Helper function to redirect with error
const redirectWithError = (res, role, errorCode, customMessage = null) => {
  const baseUrl = getRedirectUrl(role);
  const params = new URLSearchParams({
    github_error: 'true',
    error_code: errorCode
  });
  
  if (customMessage) {
    params.append('message', encodeURIComponent(customMessage));
  }
  
  const redirectUrl = `${baseUrl}/collabrativetools?${params.toString()}`;
  logInfo('Redirecting with error', { redirectUrl, errorCode, role });
  return res.redirect(redirectUrl);
};

// Helper function to redirect with success
const redirectWithSuccess = (res, role, message) => {
  const baseUrl = getRedirectUrl(role);
  const params = new URLSearchParams({
    github_success: 'true',
    message: encodeURIComponent(message)
  });
  
  const redirectUrl = `${baseUrl}/collabrativetools?${params.toString()}`;
  logInfo('Redirecting with success', { redirectUrl, message, role });
  return res.redirect(redirectUrl);
};

router.get('/', async (req, res) => {
  const startTime = Date.now();
  logInfo('GitHub callback initiated', { query: req.query });

  try {
    // Parse and validate state parameter
    let state;
    try {
      if (!req.query.state) {
        throw new Error('Missing state parameter');
      }
      state = JSON.parse(req.query.state);
    } catch (e) {
      logError('Failed to parse state parameter', e, { state: req.query.state });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or missing state parameter' 
      });
    }

    const { code } = req.query;
    const { userId, role } = state;

    // Validate required parameters
    if (!code) {
      logError('Missing authorization code');
      return redirectWithError(res, role || 'mentor', ERROR_CODES.MISSING_PARAMETERS);
    }

    if (!userId) {
      logError('Missing userId in state');
      return redirectWithError(res, role || 'mentor', ERROR_CODES.INVALID_STATE);
    }

    if (!role || !['student', 'mentor'].includes(role)) {
      logError('Invalid or missing role', null, { role });
      return redirectWithError(res, 'mentor', ERROR_CODES.INVALID_STATE);
    }

    logInfo('Processing GitHub OAuth callback', { userId, role, hasCode: !!code });

    // Step 1: Exchange authorization code for access token
    let accessToken;
    try {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: APP_CONFIG.GITHUB_CLIENT_ID,
          client_secret: APP_CONFIG.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: { 
            Accept: 'application/json',
            'User-Agent': 'Your-App-Name/1.0'
          },
          timeout: 10000 // 10 seconds timeout
        }
      );

      accessToken = tokenResponse.data.access_token;

      if (!accessToken) {
        logError('No access token received from GitHub', null, { 
          responseData: tokenResponse.data 
        });
        return redirectWithError(res, role, ERROR_CODES.TOKEN_EXCHANGE_FAILED);
      }

      logInfo('Successfully obtained GitHub access token', { 
        hasToken: !!accessToken,
        tokenLength: accessToken ? accessToken.length : 0
      });

    } catch (error) {
      logError('Failed to exchange code for access token', error, {
        githubClientId: APP_CONFIG.GITHUB_CLIENT_ID ? 'present' : 'missing',
        githubClientSecret: APP_CONFIG.GITHUB_CLIENT_SECRET ? 'present' : 'missing'
      });
      
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        return redirectWithError(res, role, ERROR_CODES.NETWORK_ERROR);
      }
      return redirectWithError(res, role, ERROR_CODES.GITHUB_API_ERROR);
    }

    // Step 2: Fetch user information from GitHub
    let userInfo;
    try {
      userInfo = await getGitHubUser(accessToken);

      if (!userInfo) {
        logError('Failed to get user info from GitHub - null response');
        return redirectWithError(res, role, ERROR_CODES.USER_INFO_FAILED);
      }

      logInfo('Successfully fetched GitHub user info', { 
        githubId: userInfo.id,
        username: userInfo.login,
        hasEmail: !!userInfo.email
      });

    } catch (error) {
      logError('Failed to fetch user information from GitHub', error);
      return redirectWithError(res, role, ERROR_CODES.GITHUB_API_ERROR);
    }

    // Step 3: Save/update GitHub user information
    let saveResult;
    try {
      saveResult = await saveGithubUserInfo(userInfo, userId, accessToken);
      
      if (!saveResult || !saveResult.success) {
        logError('Failed to save GitHub user info', null, { 
          saveResult,
          userId,
          githubId: userInfo.id 
        });

        // Handle specific error cases
        const errorCode = ERROR_CODES[saveResult?.error] || ERROR_CODES.INTERNAL_SERVER_ERROR;
        return redirectWithError(res, role, errorCode);
      }

      logInfo('Successfully saved GitHub user info', { 
        userId,
        githubId: userInfo.id,
        message: saveResult.message
      });

    } catch (error) {
      logError('Exception while saving GitHub user info', error, { userId });
      return redirectWithError(res, role, ERROR_CODES.INTERNAL_SERVER_ERROR);
    }

    // Step 4: Success - redirect with success message
    const processingTime = Date.now() - startTime;
    logInfo('GitHub OAuth flow completed successfully', {
      userId,
      role,
      processingTimeMs: processingTime,
      githubUsername: userInfo.login
    });

    return redirectWithSuccess(res, role, saveResult.message || 'GitHub connected successfully!');

  } catch (error) {
    // Catch-all error handler
    const processingTime = Date.now() - startTime;
    logError('Unexpected error in GitHub callback', error, {
      processingTimeMs: processingTime,
      query: req.query
    });

    // Try to determine role for redirect, fallback to mentor
    let fallbackRole = 'mentor';
    try {
      if (req.query.state) {
        const state = JSON.parse(req.query.state);
        fallbackRole = state.role || 'mentor';
      }
    } catch (e) {
      // Use default fallback
    }

    return redirectWithError(res, fallbackRole, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
});

// Health check endpoint for monitoring
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'github-callback'
  });
});

module.exports = router;
// const express = require('express');
// const router = express.Router();
// const axios = require('axios');
// const APP_CONFIG = require('../../../../config')
// const getGitHubUser = require('../githubUserInfo/route')
// const saveGithubUserInfo = require('../createUser.js/route')

// router.get('/', async (req, res) => {
//   console.log("getting callback........................", req.query.state)


// let state;
// try {
//   state = JSON.parse(req.query.state);
// } catch (e) {
//   console.error("Failed to parse state:", req.query.state);
//   return res.status(400).json({ error: 'Invalid state format' });
// }
// const code = req.query.code
// const userId = state.userId;
// const role = state.role;


//   console.log("role is ", role, code, userId)

//   if (!code || !userId) {
//     return res.status(400).json({
//       success: false,
//       error: 'Missing code or state parameter'
//     });
//   }

//   try {
//     console.log("code is ", code, userId)

//     // Get access token from GitHub
//     const tokenResponse = await axios.post(
//       'https://github.com/login/oauth/access_token',
//       {
//         client_id: APP_CONFIG.GITHUB_CLIENT_ID,
//         client_secret: APP_CONFIG.GITHUB_CLIENT_SECRET,
//         code,
//       },
//       {
//         headers: { Accept: 'application/json' },
//       }
//     );

//     const accessToken = tokenResponse.data.access_token;

//     if (!accessToken) {
//       console.error("No access token received from GitHub");
//       return res.status(400).json({
//         success: false,
//         error: 'Failed to obtain access token from GitHub'
//       });
//     }

//     // Get user info from GitHub
//     const userInfo = await getGitHubUser(accessToken);

//     if (!userInfo) {
//       console.error("Failed to get user info from GitHub");
//       return res.status(400).json({
//         success: false,
//         error: 'Failed to fetch user information from GitHub'
//       });
//     }

//     console.log("Access token:", accessToken, "User info:", userInfo);

//     // Save/update GitHub user info
//     const saveResult = await saveGithubUserInfo(userInfo, userId, accessToken);
//     console.log("Save result:", saveResult);

//     if (!saveResult || !saveResult.success) {
//       console.error("⚠️ User not inserted/updated in github_users!", saveResult);
//       const ERROR_CODES = {
//         'GITHUB_ID_ALREADY_LINKED': 'GITHUB_ACCOUNT_ALREADY_LINKED',
//         'NETWORK_ERROR': 'CONNECTION_FAILED',
//         'GITHUB_API_ERROR': 'GITHUB_API_FAILED',
//         'INTERNAL_SERVER_ERROR': 'UNEXPECTED_ERROR'
//       };

//       // Handle specific error cases
//       if (saveResult && saveResult.error === 'GITHUB_ID_ALREADY_LINKED') {
//         if (role === 'student') {
//           return res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);

//         } else if (role === 'mentor') {
//           return res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);
//         }
//       }
//       if (role === 'student') {
//         return res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);

//       } else if (role === 'mentor') {
//         return res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${ERROR_CODES[saveResult?.error] || 'UNKNOWN_ERROR'}`);
//       }

//     }

//     console.log("GitHub user saved successfully:", saveResult);
//     if (role === 'student') {
//       res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_success=true&message=${encodeURIComponent(saveResult.message)}`);

//     } else if (role === 'mentor') {
//       res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_success=true&message=${encodeURIComponent(saveResult.message)}`);

//     }


//   } catch (err) {
//     console.error('GitHub callback error:', err);

//     let errorCode = 'UNEXPECTED_ERROR';

//     if (err.response) {
//       errorCode = 'GITHUB_API_FAILED';
//     } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
//       errorCode = 'CONNECTION_FAILED';
//     }

//     if (role === 'student') {
//       return res.redirect(`${APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${errorCode}`);

//     } else if (role === 'mentor') {
//       return res.redirect(`${APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS}/collabrativetools?github_error=true&error_code=${errorCode}`);

//     }



//   }
// });

// module.exports = router;