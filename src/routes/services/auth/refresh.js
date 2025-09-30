// routes/auth/refresh.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyRefreshToken, generateAccessToken, generateRefreshToken } = require('../../../utils/tokenManager');
const { setAuthCookies } = require('../../../services/cookieService');
const { verifyStoredRefreshToken, getUserProfile, storeRefreshToken } = require('../../../services/userAuthService');
const APP_CONFIG = require('../../../../config');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[APP_CONFIG.BL_AUTH_REFRESH_COOKIE_NAME || 'bl_refresh'];
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    // Decode and verify JWT
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    // Verify stored refresh token
    const isValid = await verifyStoredRefreshToken(decoded.userId, refreshToken, null);
    if (!isValid) return res.status(401).json({ error: 'Refresh token revoked or invalid' });

    // Fetch profile
    const profile = await getUserProfile(decoded.userId, null);

    // Generate new tokens
    const payload = {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Store new refresh token
    await storeRefreshToken(profile.id, newRefreshToken, null);

    // Set cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.json({ message: 'Tokens refreshed successfully' });

  } catch (error) {
    console.error('Refresh token error', error.message);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

module.exports = router;
