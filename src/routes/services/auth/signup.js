// routes/auth/signup.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { isEmailValid } = require('../../../utils/email');
const { queryDatabase, getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
const { checkUnverifiedAccount, deleteExpiredUnverifiedAccounts } = require('../../../services/userVerifyService');
const emailService = require('../../../services/emailServices');
const APP_CONFIG = require('../../../../config');

const router = express.Router();

// Rate limiting map (in production, use Redis)
const signupAttempts = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUP_ATTEMPTS = 5;

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function checkRateLimit(email) {
  const now = Date.now();
  const attempts = signupAttempts.get(email) || [];
  
  // Clean old attempts
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentAttempts.length >= MAX_SIGNUP_ATTEMPTS) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestAttempt)) / 60000);
    return { allowed: false, timeLeft };
  }
  
  recentAttempts.push(now);
  signupAttempts.set(email, recentAttempts);
  return { allowed: true };
}

router.post('/', async (req, res) => {
  let client;
  try {
    const { email, password, name } = req.body.formData || {};
console.log("formData", req.body.formData)
    // 1. Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    if (!isEmailValid(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
    }
    // if (password.length < 8) {
    //   return res.status(400).json({ error: 'Password must be at least 8 characters' });
    // }

    // 2. Rate limiting
    const rateLimitCheck = checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many signup attempts. Please try again in ${rateLimitCheck.timeLeft} minutes.` 
      });
    }

    // 3. Clean up expired unverified accounts (async, non-blocking)
    deleteExpiredUnverifiedAccounts().catch(err => 
      console.error('Cleanup failed:', err.message)
    );

    // 4. Start transaction
    client = await getTransactionClient();

    // 5. Check if account exists
    const existingAccount = await checkUnverifiedAccount(email, client);

    if (existingAccount) {
      // Account exists and is VERIFIED
      if (existingAccount.verified) {
        await rollbackTransaction(client);
        return res.status(409).json({ 
          error: 'An account with this email already exists. Please sign in or reset your password.',
          action: 'signin'
        });
      }

      // Account exists but UNVERIFIED
      const now = new Date();
      const tokenExpired = existingAccount.verification_token_expires 
        ? new Date(existingAccount.verification_token_expires) < now 
        : true;

      if (tokenExpired) {
        // Token expired - resend with new token
        const newToken = generateVerificationToken();
        const newTokenHash = hashToken(newToken);
        const newExpiry = new Date(Date.now() + 15 * 60 * 1000);

        // Update user details and token
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const updateUserQuery = `
          UPDATE users 
          SET password_hash = $1, updated_at = NOW()
          WHERE id = $2
        `;
        await queryDatabase(updateUserQuery, [hashedPassword, existingAccount.user_id], client);

        const updateAdditionalInfoQuery = `
          UPDATE users_additional_info
          SET verification_token = $1, 
              verification_token_expires = $2,
              verification_attempts = verification_attempts + 1
          WHERE user_id = $3
        `;
        await queryDatabase(updateAdditionalInfoQuery, [newTokenHash, newExpiry, existingAccount.user_id], client);

        const updateMessagingQuery = `
          UPDATE messaging_users
          SET name = $1
          WHERE user_id = $2
        `;
        await queryDatabase(updateMessagingQuery, [name.trim().toLowerCase() , existingAccount.user_id], client);

        // Send new verification email
        try {
          await emailService.sendVerificationEmail(
            email, 
            newToken, 
            `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${newToken}`
          );
        } catch (err) {
          console.error('Email send failed:', err.message);
        }

        await commitTransaction(client);

        return res.status(200).json({
          message: 'Your previous verification link expired. We\'ve sent a new verification email.',
          action: 'check_email'
        });
      } else {
        // Token still valid - just resend
        try {
          // We can't retrieve the original token (it's hashed), so generate new one
          const newToken = generateVerificationToken();
          const newTokenHash = hashToken(newToken);
          const newExpiry = new Date(Date.now() + 15 * 60 * 1000);

          const updateTokenQuery = `
            UPDATE users_additional_info
            SET verification_token = $1,
                verification_token_expires = $2,
                verification_attempts = verification_attempts + 1
            WHERE user_id = $3
          `;
          await queryDatabase(updateTokenQuery, [newTokenHash, newExpiry, existingAccount.user_id], client);

          await emailService.sendVerificationEmail(
            email, 
            newToken, 
            `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${newToken}`
          );
        } catch (err) {
          console.error('Email resend failed:', err.message);
        }

        await commitTransaction(client);

        return res.status(200).json({
          message: 'An account with this email already exists but is not verified. We\'ve sent a new verification email.',
          action: 'check_email'
        });
      }
    }

    // 6. Create NEW user (email doesn't exist)
    const hashedPassword = await bcrypt.hash(password, 12);
    const usersInsertQuery = `
      INSERT INTO users (password_hash, verified)
      VALUES ($1, $2)
      RETURNING id, created_at
    `;
    const [newUser] = await queryDatabase(usersInsertQuery, [hashedPassword, false], client);
    if (!newUser) throw new Error('Failed to create user record');

    // 7. Additional info with verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenHash = hashToken(verificationToken);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    const additionalInfoInsertQuery = `
      INSERT INTO users_additional_info (
        user_id, 
        verification_token, 
        verification_token_expires,
        verification_attempts
      )
      VALUES ($1, $2, $3, 1)
      RETURNING id
    `;
    const additionalInfoResult = await queryDatabase(
      additionalInfoInsertQuery, 
      [newUser.id, verificationTokenHash, expiry], 
      client
    );
    if (!additionalInfoResult.length) throw new Error('Failed to register new user');

    // 8. Messaging user
    const messagingInsertQuery = `
      INSERT INTO messaging_users (user_id, name, email, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const [messagingUser] = await queryDatabase(
      messagingInsertQuery, 
      [newUser.id, name.trim().toLowerCase() , email, 'student'], 
      client
    );
    if (!messagingUser) throw new Error('Failed to create messaging user record');

    // 9. Send verification email (non-blocking failure)
    try {
      await emailService.sendVerificationEmail(
        email, 
        verificationToken, 
        `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${verificationToken}`
      );
    } catch (err) {
      console.error('Email send failed:', err.message);
    }
console.log("commitinging client")
    // 10. Commit transaction
    await commitTransaction(client);
console.log("Registration successful!")
    return res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      action: 'check_email'
    });

  } catch (error) {
    if (client) await rollbackTransaction(client);
    console.error('Signup error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// // routes/auth/signup.js
// const express = require('express');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto')
// const { isEmailValid } = require('../../../utils/email');
// const { queryDatabase, getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
// const { setAuthCookies } = require('../../../services/cookieService');
// const { checkEmailExists } = require('../../../services/userVerifyService');
// const { storeRefreshToken, getUserProfile } = require('../../../services/userAuthService');
// const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
// const APP_CONFIG = require('../../../../config');
// const emailService = require('../../../services/emailServices')

// const router = express.Router();

// function generateVerificationToken() {
//   return crypto.randomBytes(32).toString('hex');
// }

// router.post('/', async (req, res) => {
//   let client;
//   try {
//     const { email, password, name } = req.body.formData || {};

//     // 1. Validate input
//     if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required' });
//     if (!isEmailValid(email)) return res.status(400).json({ error: 'Invalid email format' });
//     if (name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });

//     // 2. Start transaction
//     client = await getTransactionClient();

//     // 3. Check email
//     const emailExists = await checkEmailExists(email, client);
//     if (emailExists) {
//       await rollbackTransaction(client);
//       return res.status(409).json({ error: 'Email already exists' });
//     }

//     // 4. Create user
//     const hashedPassword = await bcrypt.hash(password, 12);
//     const usersInsertQuery = `
//       INSERT INTO users (password_hash, verified)
//       VALUES ($1, $2)
//       RETURNING id, created_at
//     `;
//     const [newUser] = await queryDatabase(usersInsertQuery, [hashedPassword, false], client);
//     if (!newUser) throw new Error('Failed to create user record');

//     // 5. Additional info (verification token)
//     const verificationToken = generateVerificationToken();
    
//     const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
//     console.log("tokens are", verificationToken, verificationTokenHash)
//     const expiry = new Date(Date.now() + 15 * 60 * 1000);

//     const additional_infoInsertQuery = `
//       INSERT INTO users_additional_info (user_id, verification_token, verification_token_expires)
//       VALUES ($1, $2, $3)
//       RETURNING id
//     `;
//     const additional_infoResult = await queryDatabase(additional_infoInsertQuery, [newUser.id, verificationTokenHash, expiry], client);
//     if (!additional_infoResult.length) throw new Error('Failed to register new user');

//     // 6. Messaging user
//     const messagingInsertQuery = `
//       INSERT INTO messaging_users (user_id, name, email, role)
//       VALUES ($1, $2, $3, $4)
//       RETURNING id
//     `;
//     const [messagingUser] = await queryDatabase(messagingInsertQuery, [newUser.id, name.trim(), email, 'student'], client);
//     if (!messagingUser) throw new Error('Failed to create messaging user record');

//     // 7. Send verification email (non-blocking failure)
//     try {
//       await emailService.sendVerificationEmail(email, verificationToken, `${APP_CONFIG.DEFAULT_REDIRECT_URL}/verify/email?token=${verificationToken}`);
//     } catch (err) {
//       console.error('Email send failed:', err.message);
//     }

//     // 8. Commit transaction
//     await commitTransaction(client);

//     return res.status(201).json({
//       message: 'User registered successfully. Please verify your email to activate your account.'
//     });

//   } catch (error) {
//     if (client) await rollbackTransaction(client);
//     console.error('Signup error:', error.message);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });
// module.exports = router;
