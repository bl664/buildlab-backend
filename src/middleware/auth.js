const jwt = require('jsonwebtoken');
const APP_CONFIG = require('../../config');

if (!APP_CONFIG.BL_AUTH_COOKIE_NAME) {
    throw new Error('BL_AUTH_COOKIE_NAME is not set in the configuration');
}

if (!APP_CONFIG.BL_AUTH_SECRET_KEY) {
    throw new Error('BL_AUTH_SECRET_KEY is not set in the configuration');
}

const authMiddleware = (req, res, next) => {

    const token = req.cookies[APP_CONFIG.BL_AUTH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      // Verify the token
      const decoded = jwt.verify(token, APP_CONFIG.BL_AUTH_SECRET_KEY);
      // console.log("decode", decoded)
          // Verify that the token was issued for this application
      if (decoded.token_name !== APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME) {
        throw new Error('Token was not issued for this application');
      }
  
      // Attach the user information to the request object
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        store_id: decoded.store_id
      };
        next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  module.exports = authMiddleware;