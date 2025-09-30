// services/cookieService.js
const APP_CONFIG = require('../../config');

const setAuthCookies = (res, accessToken, refreshToken) => {
  const baseOptions = {
    httpOnly: APP_CONFIG.BL_AUTH_COOKIE_HTTP_ONLY,
    secure:  APP_CONFIG.BL_AUTH_COOKIE_SECURE === 'true',
    sameSite: 'none',
    domain: APP_CONFIG.BL_AUTH_COOKIE_ALLOWED_DOMAIN,
    maxAge: APP_CONFIG.BL_AUTH_COOKIE_MAXAGE,
    path: '/',
  };

  // Access token (short lived)
  res.cookie(APP_CONFIG.BL_AUTH_COOKIE_NAME , accessToken, {
    ...baseOptions
  });

  // Refresh token (long lived)
  res.cookie(APP_CONFIG.BL_AUTH_REFRESH_COOKIE_NAME || 'bl_refresh', refreshToken, {
    ...baseOptions,
    maxAge: parseInt(APP_CONFIG.BL_AUTH_REFRESH_COOKIE_MAXAGE || (7 * 24 * 60 * 60 * 1000), 10),
  });
};

module.exports = { setAuthCookies };



// const APP_CONFIG = require('../../config');
// const { generateToken } = require('../utils/tokenManager');

// const sendAuthCookie = (res, user) => {
//   const tokenPayload = {
//     user_id: user.id,
//     email: user.email,
//     name: user.name,
//     role: user.role,
//   };
//   console.log("generating token")
//   const token = generateToken(tokenPayload);
// // console.log("genratd token: ",APP_CONFIG.BL_AUTH_COOKIE_NAME, token)
// res.cookie(APP_CONFIG.BL_AUTH_COOKIE_NAME, token, {
//   httpOnly: APP_CONFIG.BL_AUTH_COOKIE_HTTP_ONLY,
//   secure: APP_CONFIG.BL_AUTH_COOKIE_SECURE === 'true',
//   sameSite: 'Lax', // Explicitly set to None for testing
//   // domain: APP_CONFIG.BL_AUTH_COOKIE_ALLOWED_DOMAIN,
//   maxAge: APP_CONFIG.BL_AUTH_COOKIE_MAXAGE,
//   path: '/'
// });
//   return {
//     id: user.id,
//     email: user.email,
//     name: user.name,
//     role: user.role,
//     token: token
//   };
// };

// // Function to clear authentication cookie
// const clearAuthCookie = (res) => {
//   res.clearCookie(APP_CONFIG.BL_AUTH_COOKIE_NAME, {
//     httpOnly: APP_CONFIG.BL_AUTH_COOKIE_HTTP_ONLY,
//     secure: APP_CONFIG.BL_AUTH_COOKIE_SECURE === 'true',
//     sameSite: APP_CONFIG.BL_AUTH_COOKIE_SAME_SITE,
//     domain: APP_CONFIG.BL_AUTH_COOKIE_ALLOWED_DOMAIN,
//     path: '/'
//   });

//   return true;
// };


// module.exports = {
//   sendAuthCookie,
//   clearAuthCookie
// };

// res.cookie(APP_CONFIG.BL_AUTH_COOKIE_NAME, token, {
//   httpOnly: APP_CONFIG.BL_AUTH_COOKIE_HTTP_ONLY,
//   secure: APP_CONFIG.BL_AUTH_COOKIE_SECURE === 'true',
//   sameSite: 'none',
//   domain: APP_CONFIG.BL_AUTH_COOKIE_ALLOWED_DOMAIN,
//   maxAge: APP_CONFIG.BL_AUTH_COOKIE_MAXAGE,
//   path: '/'
// });