// routes/auth/signin.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const { isEmailValid } = require('../../../utils/email');
const { queryDatabase, getTransactionClient } = require('../../../services/dbQuery');
const { setAuthCookies } = require('../../../services/cookieService');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
const {
  updateFailedLogin,
  resetFailedLogin,
  storeRefreshToken,
  getUserAuthData,
  getUserProfile
} = require('../../../services/userAuthService');
const APP_CONFIG = require('../../../../config');

const router = express.Router();

// Rate limiter for signin
const signinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
});

router.post('/', signinRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      console.log('signin_missing_fields', { ip: req.ip });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isEmailValid(email)) {
      console.log('signin_invalid_email', { ip: req.ip, email });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const client = await getTransactionClient();
    try {
      const user = await getUserAuthData(email, client);

      if (!user) {
        // no user: release transaction and respond
        await client.query('ROLLBACK');
        client.release();
        console.log('signin_invalid_credentials', { ip: req.ip, email });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Lockout check
      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        await client.query('ROLLBACK');
        client.release();
        console.log('signin_account_locked', { userId: user.id, ip: req.ip });
        return res.status(423).json({ error: 'Account locked, try later' });
      }

      // Password check
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await updateFailedLogin(user, client);
        await client.query('COMMIT');
        client.release();
        console.log('signin_failed_password', { userId: user.id, ip: req.ip });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Reset failed login
      await resetFailedLogin(user.id, client);

      // Fetch profile (email, name, role, created_at)
      const profile = await getUserProfile(user.id, client);

      // Tokens
      const payload = { userId: user.id, email: profile.email, name: profile.name, role: profile.role, token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME, };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      await storeRefreshToken(user.id, refreshToken, client);

      await client.query('COMMIT');
      client.release();

      // Set cookies (httpOnly), do not return raw tokens in the JSON
      setAuthCookies(res, accessToken, refreshToken);
      console.log('signin_success', { userId: user.id, ip: req.ip });

      const safeUserData = {
        id: user.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        created_at: profile.created_at
      };

      let redirectUrl;
      if (safeUserData.role === 'student') redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
      else if (safeUserData.role === 'mentor') redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
      else redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';

      return res.json({ message: 'Authenticated successfully', user: safeUserData, redirectUrl });

    } catch (err) {
      // ensure rollback & release on transaction error
      try { await client.query('ROLLBACK'); } catch (e) {/* ignore */ }
      client.release();
      console.error('Signin transaction error', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Signin error', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


// const express = require('express');
// const bcrypt = require('bcryptjs');
// const { isEmailValid } = require('../../../utils/email');
// const { queryDatabase } = require('../../../services/dbQuery');
// const { sendAuthCookie } = require('../../../services/cookieService');
// const { checkEmailExists } = require('../../../services/userVerifyService');
// const APP_CONFIG = require('../../../../config');

// const router = express.Router();

// router.post('/', async (req, res) => {
//   console.log('Signin request body:', req.body);    
//   const { email, password } = req.body || {};

// if (!email || !password) {
//     console.log('Missing required fields in signin', { 
//       hasEmail: !!email, 
//       hasPassword: !!password 
//     });
//     return res.status(400).json({ error: 'Email and password are required' });
//   }

//   if (!isEmailValid(email)) {
//     console.log('Invalid email format', { email });
//     return res.status(400).json({ error: 'Invalid email format' });
//   }

//   try {
//     const emailExists = await checkEmailExists(email);

//     if (!emailExists) {
//         console.log('Login attempt with non-existent email', { email });
//         return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     const userQuery = `
//       SELECT u.id, u.password_hash, u.created_at,
//              mu.email, mu.name, mu.role
//       FROM users u
//       LEFT JOIN messaging_users mu ON u.id = mu.user_id
//       WHERE mu.email = $1
//     `;
//     const userValues = [email];

//     const result = await queryDatabase(userQuery, userValues);
    
//     if (!result || result.length === 0) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     const user = result[0];
// console.log("signin user is ", user)
//     const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
//     if (!isPasswordValid) {
//       return res.status(401).json({ error: 'Invalid credentials' });
//     }

//     const safeUserData = {
//       id: user.id,
//       email: user.email,
//       name: user.name,
//       role: user.role,
//       created_at: user.created_at,
//       verified: user.verified,
//       has_group: user.has_group
//     };

//     const userResponse = sendAuthCookie(res, safeUserData);
//     console.log('User authenticated successfully', { userId: user.id, email: user.email }); 
//     // decide redirect based on role
//     let redirectUrl;
//     if (safeUserData.role === 'student') {
//       console.log("yes student",safeUserData.role , APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS)
//       redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
//     } else if (safeUserData.role === 'mentor') {
//       console.log("yes mentor",safeUserData.role , APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS)  
//       redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
//     } else {
//       redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
//     }

//     return res.json({
//       message: 'Authenticated successfully',
//       user: safeUserData,
//       auth: userResponse.token,
//       redirectUrl
//     });

//   } catch (error) {
//     console.log('Error during user signin', { 
//       error: error.message,
//       stack: error.stack
//     });
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });

// module.exports = router;
