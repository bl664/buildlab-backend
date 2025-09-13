const express = require('express');
const router = express.Router();
const APP_CONFIG = require('../../../config');

router.post('/', async (req, res) => {
  console.log("clearing cookie for logout");

  try {
    res.clearCookie(APP_CONFIG.BL_AUTH_COOKIE_NAME, {
      httpOnly: APP_CONFIG.BL_AUTH_COOKIE_HTTP_ONLY,
      secure: APP_CONFIG.BL_AUTH_COOKIE_SECURE === 'true',
      sameSite: 'Lax',
      path: '/',
      // domain: APP_CONFIG.BL_AUTH_COOKIE_ALLOWED_DOMAIN, // if used during set
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
