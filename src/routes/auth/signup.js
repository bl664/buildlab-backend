const express = require('express');
const bcrypt = require('bcryptjs');
const { isEmailValid } = require('../../utils/email');
const { queryDatabase, getTransactionClient } = require('../../services/dbQuery');
const logger = require('../../utils/logger');
const { sendAuthCookie } = require('../../services/cookieService');
const { checkEmailExists } = require('../../services/userVerifyService');
const APP_CONFIG = require('../../../config');

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, name } = req.body.formData || {};

  if (!email || !password || !name) {
    logger.warn('Missing required fields in signup', {
      hasEmail: !!email,
      hasPassword: !!password,
      hasName: !!name
    });
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  if (!isEmailValid(email)) {
    logger.warn('Invalid email format', { email });
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password strength (add your requirements)
  // if (password.length < 8) {
  //   logger.warn('Password too weak', { email });
  //   return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  // }

  // Validate name length
  if (name.trim().length < 2 || name.trim().length > 100) {
    logger.warn('Invalid name length', { email, nameLength: name.length });
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  }

  let client = null;

  try {
    const emailExists = await checkEmailExists(email);

    if (emailExists) {
      logger.warn('Signup attempt with existing email', { email });
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    client = await getTransactionClient();
    logger.info('Started transaction for user signup', { email });


    const usersInsertQuery = `
      INSERT INTO users ("password_hash")
      VALUES ($1)
      RETURNING id
    `;

    const usersInsertValues = [hashedPassword];

    const usersInsertResult = await queryDatabase(usersInsertQuery, usersInsertValues, client);

    if (!usersInsertResult || usersInsertResult.length === 0) {
      throw new Error('Failed to create user record');
    }

    const user = usersInsertResult[0];

    const messageQuery = `INSERT INTO messaging_users (user_id, name, email, role)
    VALUES ($1, $2, $3, $4) 
    RETURNING id;
    `;

    const messageValues = [user.id, name, email, 'mentor']

    const messageResult = await queryDatabase(messageQuery, messageValues, client)

    if (!messageResult || messageResult.length === 0) {
      console.log('Failed to create messaging user record')
      throw new Error('Failed to create messaging user record');
    }

    console.log("yes created", user, messageResult)
    await client.query('COMMIT');

    const safeUserData = {
      id: user.id,
      email,            // from req.body
      name: name.trim(),// from req.body
      role: 'mentor',   // hardcoded in your insert above
      created_at: user.created_at
    };

    const userResponse = sendAuthCookie(res, safeUserData);
    logger.info('User created and authenticated', res);

    let redirectUrl;
    if (safeUserData.role === 'student') {
      console.log("yes student", safeUserData.role, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS)
      redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
    } else if (safeUserData.role === 'mentor') {
      redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
    } else {
      redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
    }

    res.json({
      message: 'User created and authenticated',
      user: safeUserData,
      auth: userResponse.token,
      redirectUrl
    });

  } catch (error) {
    queryDatabase('ROLLBACK')
    logger.error('Error during user signup', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
