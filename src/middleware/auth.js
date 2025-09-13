const jwt = require('jsonwebtoken');
const APP_CONFIG = require('../../config');
const logger = require('../utils/logger');

if (!APP_CONFIG.BL_AUTH_COOKIE_NAME) {
    throw new Error('BL_AUTH_COOKIE_NAME is not set in the configuration');
}

if (!APP_CONFIG.BL_AUTH_SECRET_KEY) {
    throw new Error('BL_AUTH_SECRET_KEY is not set in the configuration');
}

const authMiddleware = (req, res, next) => {
    // console.log("req", req.headers.cookies)
    // console.log("Headers:", req.headers);

    const token = req.cookies[APP_CONFIG.BL_AUTH_COOKIE_NAME];
    console.log("token", token)
    if (!token) {
      logger.warn('No token provided');
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
  
      logger.info('Token verified successfully', { userId: decoded.userId, emailId: decoded.emailId, storeId: decoded.storeId });
      next();
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  module.exports = authMiddleware;