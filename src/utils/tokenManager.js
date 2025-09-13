const jwt = require('jsonwebtoken');
const APP_CONFIG = require('../../config');

const generateToken = (user) => {
  console.log("user", user)
  const payload = {
    userId: user.user_id,
    email: user.email,
    token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME,
    name: user.name,
    role: user.role,
  };
  const options = { expiresIn: '1d' }; // 1 day
  const token = jwt.sign(payload, APP_CONFIG.SECRET_KEY, options);
  return token;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, APP_CONFIG.SECRET_KEY);
    return decoded;
  } catch (err) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };