// utils/tokenManager.js
const jwt = require('jsonwebtoken');
const APP_CONFIG = require('../../config');

const generateAccessToken = (payload) => {
  console.log("payload is ", payload)
  return jwt.sign(payload, APP_CONFIG.SECRET_KEY, { expiresIn: APP_CONFIG.ACCESS_TOKEN_EXPIRES || '30d' });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, APP_CONFIG.SECRET_KEY, { expiresIn: APP_CONFIG.REFRESH_TOKEN_EXPIRES || '7d' });
};

const verifyAccessToken = (token) => {
  try { 
    return jwt.verify(token, APP_CONFIG.SECRET_KEY); 
  } catch (error) { 
    console.log('Access token verification failed:', error.message);
    return null; 
  }
};

const verifyRefreshToken = (token) => {
  try { 
    return jwt.verify(token, APP_CONFIG.SECRET_KEY); 
  } catch (error) { 
    console.log('Refresh token verification failed:', error.message);
    return null; 
  }
};


module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};



// const jwt = require('jsonwebtoken');
// const APP_CONFIG = require('../../config');

// const generateToken = (user) => {
//   console.log("user", user)
//   const payload = {
//     userId: user.user_id,
//     email: user.email,
//     token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME,
//     name: user.name,
//     role: user.role,
//   };
//   const options = { expiresIn: '1d' }; // 1 day
//   const token = jwt.sign(payload, APP_CONFIG.SECRET_KEY, options);
//   return token;
// };

// const verifyToken = (token) => {
//   try {
//     const decoded = jwt.verify(token, APP_CONFIG.SECRET_KEY);
//     return decoded;
//   } catch (err) {
//     return null;
//   }
// };

// module.exports = { generateToken, verifyToken };