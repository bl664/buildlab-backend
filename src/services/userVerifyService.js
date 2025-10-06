// services/userVerifyService.js
const crypto = require('crypto');
const { queryDatabase } = require('./dbQuery');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Check if email exists (verified or unverified)
const checkEmailExists = async (email, client = null) => {
  const query = 'SELECT email FROM messaging_users WHERE LOWER(email) = LOWER($1)';
  const result = await queryDatabase(query, [email], client);
  return result.length > 0;
};

// Get unverified account details
const checkUnverifiedAccount = async (email, client = null) => {
  const query = `
    SELECT 
      u.id as user_id,
      u.verified,
      u.created_at,
      uai.verification_token,
      uai.verification_token_expires,
      uai.verification_attempts,
      mu.email,
      mu.name
    FROM users u
    INNER JOIN messaging_users mu ON u.id = mu.user_id
    LEFT JOIN users_additional_info uai ON u.id = uai.user_id
    WHERE LOWER(mu.email) = LOWER($1)
  `;
  const result = await queryDatabase(query, [email], client);
  return result[0] || null;
};

// Verify email with token
const verifyEmailToken = async (token, client = null) => {
  const tokenHash = hashToken(token);
  
  const query = `
    SELECT 
      u.id as user_id,
      u.password_hash as password,
      u.verified,
      u.failed_login_attempts,
      u.lockout_until,
      uai.verification_token_expires,
      mu.email
    FROM users u
    INNER JOIN users_additional_info uai ON u.id = uai.user_id
    INNER JOIN messaging_users mu ON u.id = mu.user_id
    WHERE uai.verification_token = $1
  `;
  
  const result = await queryDatabase(query, [tokenHash], client);
  const user = result[0];
  console.log("verify user is ", user)
  if (!user) {
    console.log("Invalid verification token")
    return { success: false, error: 'Invalid verification token' };
  }

  if (user.verified) {
    console.log("Email already verified")
    return { success: false, error: 'Email already verified', alreadyVerified: true };
  }

  const now = new Date();
  const expiryDate = new Date(user.verification_token_expires);
  
  if (expiryDate < now) {
    console.log("Verification link expired. Please request a new one.")
    return { 
      success: false, 
      error: 'Verification link expired. Please request a new one.',
      expired: true,
      email: user.email
    };
  }

  return { success: true, userId: user.user_id, email: user.email, password: user.password, failed_login_attempts: user.failed_login_attempts, lockout_until: user.lockout_until };
};

// Mark user as verified
const markUserAsVerified = async (userId, client = null) => {
  const updateUserQuery = `
    UPDATE users 
    SET verified = true, updated_at = NOW()
    WHERE id = $1
  `;
  await queryDatabase(updateUserQuery, [userId], client);
console.log("marked as verified")
  const clearTokenQuery = `
    UPDATE users_additional_info
    SET verification_token = NULL,
        verification_token_expires = NULL
    WHERE user_id = $1
  `;
  await queryDatabase(clearTokenQuery, [userId], client);
  console.log("token is cleared")
};

// Resend verification email
const resendVerificationEmail = async (email, client = null) => {
  const crypto = require('crypto');
  
  function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  const account = await checkUnverifiedAccount(email, client);
  
  if (!account) {
    return { success: false, error: 'No account found with this email' };
  }

  if (account.verified) {
    return { success: false, error: 'Account already verified' };
  }

  // Generate new token
  const newToken = generateVerificationToken();
  const newTokenHash = hashToken(newToken);
  const newExpiry = new Date(Date.now() + 15 * 60 * 1000);

  const updateQuery = `
    UPDATE users_additional_info
    SET verification_token = $1,
        verification_token_expires = $2,
        verification_attempts = verification_attempts + 1
    WHERE user_id = $3
  `;
  
  await queryDatabase(updateQuery, [newTokenHash, newExpiry, account.user_id], client);

  return { 
    success: true, 
    token: newToken,
    email: account.email 
  };
};

// Delete expired unverified accounts (cleanup job)
const deleteExpiredUnverifiedAccounts = async (daysOld = 7) => {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const deleteQuery = `
    DELETE FROM users
    WHERE verified = false 
    AND created_at < $1
    RETURNING id
  `;
  
  const deleted = await queryDatabase(deleteQuery, [cutoffDate]);
  console.log(`🧹 Cleaned up ${deleted.length} expired unverified accounts`);
  return deleted.length;
};

// Update email for unverified account
const updateUnverifiedEmail = async (oldEmail, newEmail, token, client = null) => {
  const tokenHash = hashToken(token);
  
  // Verify token belongs to old email
  const verifyQuery = `
    SELECT u.id as user_id, u.verified
    FROM users u
    INNER JOIN messaging_users mu ON u.id = mu.user_id
    INNER JOIN users_additional_info uai ON u.id = uai.user_id
    WHERE LOWER(mu.email) = LOWER($1)
    AND uai.verification_token = $2
  `;
  
  const result = await queryDatabase(verifyQuery, [oldEmail, tokenHash], client);
  const user = result[0];
  
  if (!user) {
    return { success: false, error: 'Invalid token or email' };
  }

  if (user.verified) {
    return { success: false, error: 'Cannot change email for verified account' };
  }

  // Check if new email already exists
  const emailExists = await checkEmailExists(newEmail, client);
  if (emailExists) {
    return { success: false, error: 'New email already in use' };
  }

  // Update email
  const updateQuery = `
    UPDATE messaging_users
    SET email = $1
    WHERE user_id = $2
  `;
  
  await queryDatabase(updateQuery, [newEmail, user.user_id], client);

  // Generate new token for new email
  const crypto = require('crypto');
  const newToken = crypto.randomBytes(32).toString('hex');
  const newTokenHash = hashToken(newToken);
  const newExpiry = new Date(Date.now() + 15 * 60 * 1000);

  const updateTokenQuery = `
    UPDATE users_additional_info
    SET verification_token = $1,
        verification_token_expires = $2
    WHERE user_id = $3
  `;
  
  await queryDatabase(updateTokenQuery, [newTokenHash, newExpiry, user.user_id], client);

  return { 
    success: true, 
    token: newToken,
    userId: user.user_id 
  };
};

module.exports = {
  checkEmailExists,
  checkUnverifiedAccount,
  verifyEmailToken,
  markUserAsVerified,
  resendVerificationEmail,
  deleteExpiredUnverifiedAccounts,
  updateUnverifiedEmail,
};