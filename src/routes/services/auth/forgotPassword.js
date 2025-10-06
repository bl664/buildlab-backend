// routes/auth/forgotPassword.js
const express = require('express');
const crypto = require('crypto');
const { queryDatabase, getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
const emailService = require('../../../services/emailServices');
const APP_CONFIG = require('../../../../config');

const router = express.Router();

// Rate limiting map (in production, use Redis)
const resetAttempts = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_RESET_ATTEMPTS = 5;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function checkRateLimit(email) {
  const now = Date.now();
  const attempts = resetAttempts.get(email) || [];
  const recentAttempts = attempts.filter(ts => now - ts < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_RESET_ATTEMPTS) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestAttempt)) / 60000);
    return { allowed: false, timeLeft };
  }

  recentAttempts.push(now);
  resetAttempts.set(email, recentAttempts);
  return { allowed: true };
}


router.post('/', async (req, res) => {
    let client;
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

     const rateLimitCheck = checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many signup attempts. Please try again in ${rateLimitCheck.timeLeft} minutes.` 
      });
    }
 client = await getTransactionClient();
    // Fetch user by email from messaging_users + check if verified
    const userQuery = `
      SELECT u.id AS user_id, u.verified
      FROM users u
      JOIN messaging_users m ON u.id = m.user_id
      WHERE LOWER(m.email) = LOWER($1)
    `;

    const users = await queryDatabase(userQuery, [email], client);
    const user = users[0];

    

    if (!user) {
      // Always return success for security — don't reveal if email exists
      return res.status(200).json({
        message: 'If an account exists for this email, a password reset link has been sent.'
      });
    }

    // Generate token & expiry
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
const resetUrl = `${APP_CONFIG.DEFAULT_REDIRECT_URL}/reset-password?token=${token}`;

    if(!user.verified) {
        //  await emailService.sendPasswordResetEmail(email,token, resetUrl); 
        return res.status(200).json({
        message: 'Your account exists but is not verified. Please verify your account first.'
      });
    }

    // Store token in users_additional_info
    const additionalInfoInsertQuery = `
    INSERT INTO users_additional_info (
  user_id,
  verification_token,
  verification_token_expires,
  verification_attempts
)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id)
DO UPDATE SET 
  verification_token = EXCLUDED.verification_token,
  verification_token_expires = EXCLUDED.verification_token_expires,
  verification_attempts = COALESCE(users_additional_info.verification_attempts, 0) + 1
    `;
    await queryDatabase(additionalInfoInsertQuery, [user.user_id, tokenHash, expires, 1], client);
await commitTransaction(client);
    
    await emailService.sendPasswordResetEmail(email,token, resetUrl);

    return res.status(200).json({
      message: 'If an account exists for this email, a password reset link has been sent.'
    });

  } catch (err) {
    if (client) await rollbackTransaction(client);
    console.error('Forgot password error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
