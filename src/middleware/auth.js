// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} = require('../utils/tokenManager');
const {
  verifyStoredRefreshToken,
  storeRefreshToken,
  getUserProfile,
} = require('../services/userAuthService');
const APP_CONFIG = require('../../config');
const { setAuthCookies } = require('../services/cookieService');

/**
 * Helper: choose cookie names with safe fallbacks
 */
const ACCESS_COOKIE = APP_CONFIG.BL_AUTH_COOKIE_NAME;
const REFRESH_COOKIE = APP_CONFIG.BL_AUTH_REFRESH_COOKIE_NAME;

/**
 * Helper: clear auth cookies (use same domain/path config as setAuthCookies)
 */
const clearAuthCookies = (res) => {
  const opts = {
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.thebuildlab.app' : undefined,
  };
  try { res.clearCookie(ACCESS_COOKIE, opts); } catch (e) { /* ignore */ }
  try { res.clearCookie(REFRESH_COOKIE, opts); } catch (e) { /* ignore */ }
};

/**
 * Quick innocuous check to decide whether token string looks usable for jwt.verify.
 * This stops `jwt.verify(undefined)` errors.
 */
const looksLikeToken = (t) =>
  typeof t === 'string' &&
  t.trim() !== '' &&
  t !== 'undefined' &&
  t !== 'null';

/**
 * Centralized refresh flow (rotates refresh token)
 * Returns user object on success, or throws.
 */
const tryRefreshAndRotate = async (refreshToken, res) => {
  // 1. Verify refresh token signature / validity
  const decodedRefresh = verifyRefreshToken(refreshToken); 
  if (!decodedRefresh || !decodedRefresh.userId) {
    throw new Error('Invalid refresh token payload');
  }

  // 2. Verify stored hash in DB
  const isValid = await verifyStoredRefreshToken(decodedRefresh.userId, refreshToken);
  if (!isValid) {
    throw new Error('Refresh token not found / invalid');
  }

  // 3. Fetch profile
  const profile = await getUserProfile(decodedRefresh.userId);
  if (!profile) {
    throw new Error('User not found');
  }

  // 4. Generate new tokens (rotate refresh)
  const payload = {
    userId: profile.user_id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    token_name: APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  // 5. Store hash of new refresh token in DB (rotation)
  await storeRefreshToken(profile.user_id, newRefreshToken);

  // 6. Set both cookies (access + refresh)
  setAuthCookies(res, newAccessToken, newRefreshToken);

  // 7. Return user object to attach to req
  return {
    id: profile.user_id,
    email: profile.email,
    role: profile.role,
    name: profile.name,
  };
};

const authMiddleware = async (req, res, next) => {
  try {
    // read cookies using safe cookie names
    const token = req.cookies?.[ACCESS_COOKIE];
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    // helpful debug: log keys only (do not log token contents)
    // console.log('Auth cookies present:', Object.keys(req.cookies || {}));

    // if neither token present -> unauthenticated
    if (!looksLikeToken(token) && !looksLikeToken(refreshToken)) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If access token is present and looks valid for verification, try verify it
    if (looksLikeToken(token)) {
      try {
        const decoded = jwt.verify(token, APP_CONFIG.SECRET_KEY);
        // attach user and continue
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role || null,
          name: decoded.name || undefined,
        };
        return next();
      } catch (err) {
        // token expired -> try refresh if refresh token exists
        if (err.name === 'TokenExpiredError') {
          if (!looksLikeToken(refreshToken)) {
            return res.status(401).json({ error: 'Session expired' });
          }
          try {
            const user = await tryRefreshAndRotate(refreshToken, res);
            req.user = user;
            return next();
          } catch (refreshErr) {
            // refresh failed -> clear cookies and force login
            clearAuthCookies(res);
            console.warn('Refresh failed after expired access token:', refreshErr.message);
            return res.status(401).json({ error: 'Invalid refresh token' });
          }
        }

        // tampered / malformed access token -> clear cookies and reject
        if (err.name === 'JsonWebTokenError' || err.name === 'SyntaxError') {
          clearAuthCookies(res);
          console.warn('Tampered or malformed access token detected');
          return res.status(401).json({ error: 'Invalid authentication token' });
        }

        // fallback: reject
        console.warn('Access token verification error:', err.name);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    // If no access token but refresh token exists -> attempt refresh+rotate
    if (!looksLikeToken(token) && looksLikeToken(refreshToken)) {
      try {
        const user = await tryRefreshAndRotate(refreshToken, res);
        req.user = user;
        return next();
      } catch (refreshErr) {
        clearAuthCookies(res);
        console.warn('Refresh attempt failed (no access token):', refreshErr.message);
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
    }

    // fallback catch-all
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    // safe default: clear cookies to avoid repeated bad state
    try { clearAuthCookies(res); } catch (e) { /* ignore */ }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;



// const authMiddleware = async (req, res, next) => {
//   try {
//     const token = req.cookies?.[APP_CONFIG.BL_AUTH_COOKIE_NAME];
//     const refreshToken = req.cookies?.[APP_CONFIG.BL_AUTH_REFRESH_COOKIE_NAME];
//     console.log("token is ", token, refreshToken);
    
//     if (!token && !refreshToken) {
//       console.log('Authentication required')
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
//       };

//       return next();
//     } catch (err) {
//       console.log("token is refreshed")
      
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
//             userId: profile.user_id, 
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
//             id: profile.user_id, 
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

//       if (err.name === 'JsonWebTokenError' || err.name === 'SyntaxError') {
//         console.log('Tampered or malformed access token detected', err);
//         return res.status(401).json({ error: 'Invalid authentication token' });
//       }

//       return res.status(401).json({ error: 'Invalid or expired token' });
//     }

//   } catch (error) {
//     console.error('Auth error:', error.message);
//     return res.status(401).json({ error: 'Authentication failed' });
//   }
// };

// module.exports = authMiddleware;


// const jwt = require('jsonwebtoken');
// const APP_CONFIG = require('../../config');

// if (!APP_CONFIG.BL_AUTH_COOKIE_NAME) {
//   throw new Error('BL_AUTH_COOKIE_NAME is not set in the configuration');
// }
// if (!APP_CONFIG.BL_AUTH_SECRET_KEY) {
//   throw new Error('BL_AUTH_SECRET_KEY is not set in the configuration');
// }
// if (!APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME) {
//   throw new Error('BL_AUTH_JWT_TOKEN_NAME is not set in the configuration');
// }

// const authMiddleware = (req, res, next) => {
//   try {
//     const token = req.cookies?.[APP_CONFIG.BL_AUTH_COOKIE_NAME];
// console.log("token is ", token)
//     if (!token) {
//       console.log("Authentication required")
//       return res.status(401).json({ error: 'Authentication required' });
//     }

//     const decoded = jwt.verify(token, APP_CONFIG.BL_AUTH_SECRET_KEY);
// console.log("decoded token is ", decoded)
//     if (decoded.token_name !== APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME) {
//       console.log("decoded data", decoded.token_name,APP_CONFIG.BL_AUTH_JWT_TOKEN_NAME)
//       return res.status(401).json({ error: 'Invalid token issuer' });
//     }

//     req.user = {
//       id: decoded.userId,     
//       email: decoded.email,
//       role: decoded.role || null,
//     };

//     return next();
//   } catch (error) {
//     console.error('Auth error:', error.message);
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

// module.exports = authMiddleware;
