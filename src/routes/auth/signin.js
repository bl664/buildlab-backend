const express = require('express');
const bcrypt = require('bcryptjs');
const { isEmailValid } = require('../../utils/email');
const { queryDatabase } = require('../../services/dbQuery');
const { sendAuthCookie } = require('../../services/cookieService');
const { checkEmailExists } = require('../../services/userVerifyService');
const APP_CONFIG = require('../../../config');

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('Signin request body:', req.body);    
  const { email, password } = req.body || {};

if (!email || !password) {
    console.log('Missing required fields in signin', { 
      hasEmail: !!email, 
      hasPassword: !!password 
    });
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!isEmailValid(email)) {
    console.log('Invalid email format', { email });
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const emailExists = await checkEmailExists(email);

    if (!emailExists) {
        console.log('Login attempt with non-existent email', { email });
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userQuery = `
      SELECT u.id, u.password_hash, u.created_at,
             mu.email, mu.name, mu.role
      FROM users u
      LEFT JOIN messaging_users mu ON u.id = mu.user_id
      WHERE mu.email = $1
    `;
    const userValues = [email];

    const result = await queryDatabase(userQuery, userValues);
    
    if (!result || result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result[0];
console.log("signin user is ", user)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const safeUserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      verified: user.verified,
      has_group: user.has_group
    };

    const userResponse = sendAuthCookie(res, safeUserData);
    
    // decide redirect based on role
    let redirectUrl;
    if (safeUserData.role === 'student') {
      console.log("yes student",safeUserData.role , APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS)
      redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
    } else if (safeUserData.role === 'mentor') {
      redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
    } else {
      redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
    }

    return res.json({
      message: 'Authenticated successfully',
      user: safeUserData,
      auth: userResponse.token,
      redirectUrl
    });

  } catch (error) {
    console.log('Error during user signin', { 
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
