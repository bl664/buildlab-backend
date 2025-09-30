// const jwt = require('jsonwebtoken');
// const { verifyRefreshToken, generateAccessToken, generateRefreshToken, verifyAccessToken } = require('../utils/tokenManager');
// const { verifyStoredRefreshToken, storeRefreshToken, getUserProfile } = require('../services/userAuthService');
// const APP_CONFIG = require('../../config');
// const { setAuthCookies } = require('../services/cookieService');

// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.cookies?.[APP_CONFIG.BL_AUTH_COOKIE_NAME];
//     console.log("token is ", token);
    
//     if (!token) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }

//     try {
//       console.log("trying decoding...");
//       const decoded = jwt.verify(token, APP_CONFIG.SECRET_KEY);
//       console.log("decoded is not expired", decoded);
      
//       // FIX 1: Consistent user object structure
//       req.user = { 
//         id: decoded.userId, 
//         email: decoded.email, 
//         role: decoded.role || null,
//         name: decoded.name
//       };

//       return next();
//     } catch (err) {
//       console.log("token is refreshed")
//       const refreshToken = req.cookies?.refreshToken || req.cookies['bl_refresh'];
//       console.log("token is expired", err.name, "refreshToken exists:", !!refreshToken);

//       if ((err.name === 'TokenExpiredError' || err.name === 'TypeError') && refreshToken) {
//         try {
//           console.log("refreshing token...");
//           const decodedRefresh = verifyRefreshToken(refreshToken);
//           console.log("decoded refresh token is ", decodedRefresh);

//           if (!decodedRefresh) {
//             console.log('Invalid refresh token format');
//             return res.status(401).json({ error: 'Invalid refresh token' });
//           }

//           const isValidRefreshToken = await verifyStoredRefreshToken(decodedRefresh.userId, refreshToken);
//           console.log("isValid refresh token:", isValidRefreshToken);

//           if (!isValidRefreshToken) {
//             console.log('Invalid refresh token');
//             return res.status(401).json({ error: 'Invalid refresh token' });
//           }

//           const profile = await getUserProfile(decodedRefresh.userId);
//           console.log("user profile is ", profile);
          
//           if (!profile) {
//             console.log("User not found");
//             return res.status(401).json({ error: 'User not found' });
//           }

//           // FIX 2: Create payload for new token (exclude iat and exp)
//           const payload = { 
//             userId: decodedRefresh.userId, 
//             email: profile.email, 
//             name: profile.name, 
//             role: profile.role, 
//             token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME 
//             // Do NOT include iat or exp - let JWT generate fresh ones
//           };
//           console.log("payload is ", payload);

//           const newAccessToken = generateAccessToken(payload);
//           console.log("new accesstoken generated:", newAccessToken);

//           setAuthCookies(res, newAccessToken, refreshToken);
//           console.log("cookies set");

//           // FIX 4: Update the request cookie so middleware uses the new token
//           req.cookies[APP_CONFIG.BL_AUTH_COOKIE_NAME] = newAccessToken;

//           // FIX 3: Consistent user object structure (use id, not userId)
//           req.user = { 
//             id: decodedRefresh.userId, 
//             email: profile.email, 
//             role: profile.role,
//             name: profile.name
//           };

//           return next();
//         } catch (refreshErr) {
//           console.error('Refresh token invalid:', refreshErr.message);
//           return res.status(401).json({ error: 'Invalid refresh token' });
//         }
//       }

//       return res.status(401).json({ error: 'Invalid or expired token' });
//     }
//   } catch (error) {
//     console.error('Auth error:', error.message);
//     return res.status(401).json({ error: 'Authentication failed' });
//   }
// };

// module.exports = authMiddleware;


const jwt = require('jsonwebtoken');
const APP_CONFIG = require('../../config');

if (!APP_CONFIG.BL_AUTH_COOKIE_NAME) {
  throw new Error('BL_AUTH_COOKIE_NAME is not set in the configuration');
}
if (!APP_CONFIG.BL_AUTH_SECRET_KEY) {
  throw new Error('BL_AUTH_SECRET_KEY is not set in the configuration');
}
if (!APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME) {
  throw new Error('BL_AUTH_JWT_TOKEN_NAME is not set in the configuration');
}

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.[APP_CONFIG.BL_AUTH_COOKIE_NAME];
// console.log("token is ", token)
    if (!token) {
      // console.log("Authentication required")
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, APP_CONFIG.BL_AUTH_SECRET_KEY);
// console.log("decoded token is ", decoded)
    if (decoded.token_name !== APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME) {
      console.log("decoded data", decoded.token_name,APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME)
      return res.status(401).json({ error: 'Invalid token issuer' });
    }

    req.user = {
      id: decoded.userId,     
      email: decoded.email,
      role: decoded.role || null,
    };

    return next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
