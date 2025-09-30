// routes/auth/signup.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')
const { isEmailValid } = require('../../../utils/email');
const { queryDatabase, getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
const { setAuthCookies } = require('../../../services/cookieService');
const { checkEmailExists } = require('../../../services/userVerifyService');
const { storeRefreshToken, getUserProfile } = require('../../../services/userAuthService');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
const APP_CONFIG = require('../../../../config');
const emailService = require('../../../services/emailServices')

const router = express.Router();

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/', async (req, res) => {
  let client;
  try {
    const { email, password, name } = req.body.formData || {};

    // 1. Validate input
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required' });
    if (!isEmailValid(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });

    // 2. Start transaction
    client = await getTransactionClient();

    // 3. Check email
    const emailExists = await checkEmailExists(email, client);
    if (emailExists) {
      await rollbackTransaction(client);
      return res.status(409).json({ error: 'Email already exists' });
    }

    // 4. Create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const usersInsertQuery = `
      INSERT INTO users (password_hash, verified)
      VALUES ($1, $2)
      RETURNING id, created_at
    `;
    const [newUser] = await queryDatabase(usersInsertQuery, [hashedPassword, false], client);
    if (!newUser) throw new Error('Failed to create user record');

    // 5. Additional info (verification token)
    const verificationToken = generateVerificationToken();
    
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    console.log("tokens are", verificationToken, verificationTokenHash)
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    const additional_infoInsertQuery = `
      INSERT INTO users_additional_info (user_id, verification_token, verification_token_expires)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const additional_infoResult = await queryDatabase(additional_infoInsertQuery, [newUser.id, verificationTokenHash, expiry], client);
    if (!additional_infoResult.length) throw new Error('Failed to register new user');

    // 6. Messaging user
    const messagingInsertQuery = `
      INSERT INTO messaging_users (user_id, name, email, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const [messagingUser] = await queryDatabase(messagingInsertQuery, [newUser.id, name.trim(), email, 'student'], client);
    if (!messagingUser) throw new Error('Failed to create messaging user record');

    // 7. Send verification email (non-blocking failure)
    try {
      await emailService.sendVerificationEmail(email, verificationToken, `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${verificationToken}`);
    } catch (err) {
      console.error('Email send failed:', err.message);
    }

    // 8. Commit transaction
    await commitTransaction(client);

    return res.status(201).json({
      message: 'User registered successfully. Please verify your email to activate your account.'
    });

  } catch (error) {
    if (client) await rollbackTransaction(client);
    console.error('Signup error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;
