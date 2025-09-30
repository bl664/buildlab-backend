// routes/auth/verify.js
const express = require('express');
const crypto = require('crypto');
const { setAuthCookies } = require('../../../services/cookieService');
const { storeRefreshToken, getUserProfile } = require('../../../services/userAuthService');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
const { queryDatabase, getTransactionClient, rollbackTransaction, commitTransaction } = require('../../../services/dbQuery');
const APP_CONFIG = require('../../../../config')
const router = express.Router();

router.post('/', async (req, res) => {
  console.log("verifying...")
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Invalid verification link.' });
// console.log("token is ", token)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
let client;
  try {
    console.log("fetching user")
    //client = await getTransactionClient();

    const findTokenQuery = `
      SELECT u.id, u.verified, uai.verification_token_expires
      FROM users_additional_info uai
      JOIN users u ON u.id = uai.user_id
      WHERE uai.verification_token = $1
    `;
// console.log("token hash ", tokenHash)
    const [user] = await queryDatabase(findTokenQuery, [tokenHash]);

    if (!user) {
      console.log("no user found")
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }
// console.log("user is ", user)
    if (user.verified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }
// console.log("user is verified")
    if (new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Verification link has expired.' });
    }

    const updateUserQuery = `
      UPDATE users
      SET verified = TRUE
      WHERE id = $1
    `;
    await queryDatabase(updateUserQuery, [user.id]);
// console.log("updated")
    // Optionally, delete the token record so it can't be reused
    const deleteTokenQuery = `
      DELETE FROM users_additional_info
      WHERE user_id = $1
    `;
    await queryDatabase(deleteTokenQuery, [user.id]);
// console.log("deleted")
    const profile = await getUserProfile(user.id);
    console.log("profile is ", profile)
     const payload = { userId: user.id, email: profile.email, name: profile.name, role: profile.role };
     console.log("payload", payload)
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await storeRefreshToken(user.id, refreshToken, null);
// console.log("stored auth cookie")
      setAuthCookies(res, accessToken, refreshToken);
// console.log("set auth cookie")
      const safeUserData = {
        id: user.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        created_at: profile.created_at,
      };
// console.log("safe uyser is ", safeUserData)
      let redirectUrl;
      if (safeUserData.role === 'student') {
        redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
      }
      else if (safeUserData.role === 'mentor') {
        redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
      }
      else {
        redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
      }
// console.log("redirect url", redirectUrl)
    return res.status(200).json({ message: 'Email verified successfully!', redirectUrl });
  } catch (error) {
    console.error('Email verification error:', error.message);
    // await rollbackTransaction(client)
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

     /*  const profile = await getUserProfile(newUser.id, null);

      const payload = { userId: newUser.id, email: profile.email, name: profile.name, role: profile.role };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await storeRefreshToken(newUser.id, refreshToken, null);

      setAuthCookies(res, accessToken, refreshToken);

      const safeUserData = {
        id: newUser.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        created_at: profile.created_at,
      };

      let redirectUrl;
      if (safeUserData.role === 'student') {
        await emailService.sendVerificationEmail(email, verificationToken, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS);
        redirectUrl = APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS;
      }
      else if (safeUserData.role === 'mentor') {
        await emailService.sendVerificationEmail(email, verificationToken, APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS);
        redirectUrl = APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS;
      }
      else {
        redirectUrl = APP_CONFIG.DEFAULT_REDIRECT_URL || '/';
      }  */