const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const { isEmailValid } = require('../../../utils/email');
const { queryDatabase, getTransactionClient, commitTransaction, rollbackTransaction } = require('../../../services/dbQuery');
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

const signinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
});

router.post('/', signinRateLimiter, async (req, res) => {
  let client;
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isEmailValid(email)) {
      console.log('signin_invalid_email', { ip: req.ip, email });
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    client = await getTransactionClient();
    try {
      const user = await getUserAuthData(email, client);
      if (!user) {
        await commitTransaction(client)
        console.log('signin_invalid_credentials', { ip: req.ip, email });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        await commitTransaction(client)
        console.log('signin_account_locked', { userId: user.id, ip: req.ip });
        return res.status(423).json({ error: 'Account locked, try later' });
      }

      if (!user.verified) {
        await commitTransaction(client)
        console.log('user is not verified', { userId: user.id, ip: req.ip });
        return res.status(423).json({ error: 'User is not verified. You can request for a new link to verify.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        await updateFailedLogin(user, client);
        await commitTransaction(client)
        console.log('signin_failed_password', { userId: user.id, ip: req.ip });
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      await resetFailedLogin(user.id, client);

      const profile = await getUserProfile(user.id, client);
      const payload = { userId: user.id, email: profile.email, name: profile.name, role: profile.role, token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await storeRefreshToken(user.id, refreshToken, client);

      await commitTransaction(client);

      setAuthCookies(res, accessToken, refreshToken);

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
      await rollbackTransaction(client);
      console.error('Signin transaction error', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Signin error', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;