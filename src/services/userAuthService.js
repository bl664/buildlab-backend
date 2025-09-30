// services/userAuthService.js
const bcrypt = require('bcryptjs');
const { queryDatabase } = require('./dbQuery');

const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_FAILED_ATTEMPTS || '5', 10);
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_MINUTES || '15', 10);
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// Fetch auth data (used inside a transaction; includes lockout + refresh token hash)
const getUserAuthData = async (email, client) => {
  const query = `
   SELECT u.id,
       u.password_hash,
       u.failed_login_attempts,
       u.lockout_until,
       u.refresh_token_hash
FROM users u
INNER JOIN messaging_users mu ON u.id = mu.user_id
WHERE mu.email = $1
FOR UPDATE
  `;
  const rows = await queryDatabase(query, [email], client);
  return rows[0];
};

// Fetch profile for response (only fields that exist)
const getUserProfile = async (userId, client= null) => {
  const query = `
    SELECT mu.email,
           mu.name,
           mu.role,
           u.created_at,
           u.updated_at
    FROM users u
    LEFT JOIN messaging_users mu ON u.id = mu.user_id
    WHERE u.id = $1
  `;
  const rows = await queryDatabase(query, [userId], client);
  return rows[0];
};

const updateFailedLogin = async (user, client) => {
  const failedAttempts = (user.failed_login_attempts || 0) + 1;
  let lockoutUntil = null;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
  }
  const query = `
    UPDATE users
    SET failed_login_attempts = $1,
        lockout_until = $2
    WHERE id = $3
  `;
  await queryDatabase(query, [failedAttempts, lockoutUntil, user.id], client);
};

const resetFailedLogin = async (userId, client) => {
  const query = `
    UPDATE users
    SET failed_login_attempts = 0,
        lockout_until = NULL
    WHERE id = $1
  `;
  await queryDatabase(query, [userId], client);
};

const storeRefreshToken = async (userId, refreshToken, client) => {
  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);
  const query = `
    UPDATE users
    SET refresh_token_hash = $1
    WHERE id = $2
  `;
  await queryDatabase(query, [refreshTokenHash, userId], client);
};

// New: verify provided refresh token against stored hashed value
const verifyStoredRefreshToken = async (userId, refreshToken, client = null) => {
  const query = `SELECT refresh_token_hash FROM users WHERE id = $1`;
  const rows = await queryDatabase(query, [userId], client);
  const storedHash = rows[0]?.refresh_token_hash;
  if (!storedHash) return false;
  return await bcrypt.compare(refreshToken, storedHash);
};

module.exports = {
  getUserAuthData,
  getUserProfile,
  updateFailedLogin,
  resetFailedLogin,
  storeRefreshToken,
  verifyStoredRefreshToken, // exported for refresh endpoint use
};
