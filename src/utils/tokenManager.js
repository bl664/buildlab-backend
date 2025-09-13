const jwt = require('jsonwebtoken');
const APP_CONFIG = require('../../config');
const logger = require('./logger');

const generateToken = (user) => {
  console.log("user", user)
  const payload = {
    userId: user.user_id,
    email: user.email,
    token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME,
    name: user.name,
    role: user.role,
  };
  logger.info('Generating token with payload: ' + JSON.stringify(payload, null, 2));
  const options = { expiresIn: '1d' }; // 1 day
  const token = jwt.sign(payload, APP_CONFIG.SECRET_KEY, options);
  logger.info('Generated token: ' + token);
  return token;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, APP_CONFIG.SECRET_KEY);
    logger.info('Token verified successfully: ' + JSON.stringify({
      userId: decoded.userId,
      emailId: decoded.emailId,
    }, null, 2));
    return decoded;
  } catch (err) {
    logger.warn('Token verification failed: ' + err.message);
    return null;
  }
};

module.exports = { generateToken, verifyToken };