// routes/auth/resetPassword.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { queryDatabase } = require('../../../services/dbQuery');

const router = express.Router();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/', async (req, res) => {
  console.log("reseting password...")
  try {
     const { token } = req.query;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'There is an error.' });
    }

    // if (password.length < 8) {
    //   return res.status(400).json({ error: 'Password must be at least 8 characters' });
    // }

    const tokenHash =  hashToken(token);

    const query = `
      SELECT uai.user_id, uai.verification_token_expires
      FROM users_additional_info uai
      JOIN users u ON uai.user_id = u.id
      WHERE uai.verification_token = $1
    `;
    const users = await queryDatabase(query, [tokenHash]);
    const user = users[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token. Request for a new one' });
    }

    if (new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await queryDatabase(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.user_id]
    );

    // Clear reset token
    await queryDatabase(
      'UPDATE users_additional_info SET verification_token = NULL, verification_token_expires = NULL WHERE user_id = $1',
      [user.user_id]
    );

    return res.status(200).json({ message: 'Password reset successful. You can now log in.' });

  } catch (err) {
    console.error('Reset password error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
