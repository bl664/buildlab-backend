// src/middleware/cors.js
const cors = require('cors');
const APP_CONFIG = require('../../config');

// Build allowed origins list with validation
const allowedOrigins = [
  APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,
  APP_CONFIG.DEFAULT_REDIRECT_URL,
  APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS,
  APP_CONFIG.CORS_TRUSTED_ORIGIN,
  ...(process.env.NODE_ENV === 'development'
    ? [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
      ]
    : [])
]
  .filter(Boolean) 
  .filter((origin) => {
    // Validate origins are properly formatted URLs
    if (typeof origin !== 'string') return false;
    try {
      new URL(origin);
      return true;
    } catch {
      console.warn(`⚠️ Invalid origin in config: ${origin}`);
      return false;
    }
  });

// Log allowed origins on startup (only once)
if (process.env.NODE_ENV === 'development') {
  console.log('🌐 CORS Allowed Origins:', allowedOrigins);
}

// Track blocked origins for rate limiting logging
const blockedOriginsCache = new Map();
const BLOCKED_LOG_INTERVAL = 60000; // Log same blocked origin max once per minute

// ============================================================================
// ORIGIN VALIDATION
// ============================================================================

function isOriginAllowed(origin) {
  // No origin (server-to-server, mobile apps, curl, Postman, etc.)
  if (!origin) {
    return true;
  }

  // Check exact match in allowed origins
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Development mode: allow localhost and 127.0.0.1 with any port
  if (process.env.NODE_ENV === 'development') {
    if (typeof origin === 'string') {
      try {
        const url = new URL(origin);
        const hostname = url.hostname;
        
        // Allow localhost, 127.0.0.1, and [::1] (IPv6 localhost)
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '[::1]' ||
          hostname === '192.168.68.105'
        ) {
          return true;
        }
      } catch (err) {
        // Invalid URL format
        return false;
      }
    }
  }

  return false;
}

function logBlockedOrigin(origin) {
  const now = Date.now();
  const lastLogged = blockedOriginsCache.get(origin);

  // Only log if this origin hasn't been logged recently
  if (!lastLogged || now - lastLogged > BLOCKED_LOG_INTERVAL) {
    console.warn(`🚫 CORS blocked request from origin: ${origin}`);
    blockedOriginsCache.set(origin, now);
  }

  // Cleanup old entries periodically (prevent memory leak)
  if (blockedOriginsCache.size > 1000) {
    const oldestAllowed = now - BLOCKED_LOG_INTERVAL;
    for (const [key, timestamp] of blockedOriginsCache.entries()) {
      if (timestamp < oldestAllowed) {
        blockedOriginsCache.delete(key);
      }
    }
  }
}

// ============================================================================
// CORS OPTIONS
// ============================================================================

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      // Allow the request
      callback(null, true);
    } else {
      // Log blocked origin (rate limited)
      logBlockedOrigin(origin);
      
      // Reject with CORS error
      // Note: Don't expose detailed error messages to potential attackers
      callback(new Error('Not allowed by CORS'));
    }
  },

  // HTTP methods allowed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Headers that can be sent in requests
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cache-Control',
    'Pragma',
  ],

  // Headers exposed to the client
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Cache preflight requests for 24 hours
  maxAge: 86400,

  // Don't pass preflight to next handler
  preflightContinue: false,

  // Success status for preflight
  optionsSuccessStatus: 204, // 204 is more appropriate than 200 for OPTIONS
};

// ============================================================================
// MIDDLEWARE EXPORT
// ============================================================================

const corsMiddleware = cors(corsOptions);

// ============================================================================
// ERROR HANDLER FOR CORS (Optional - Use in error handling middleware)
// ============================================================================

/**
 * Express error handler specifically for CORS errors
 * Add this to your error handling middleware chain
 */
function corsErrorHandler(err, req, res, next) {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }
  // Pass to next error handler if not a CORS error
  next(err);
}

// ============================================================================
// HEALTH CHECK FOR CORS CONFIG
// ============================================================================

/**
 * Validates CORS configuration on startup
 * Call this in your app initialization to catch config errors early
 */
function validateCorsConfig() {
  const errors = [];

  if (allowedOrigins.length === 0) {
    errors.push('No allowed origins configured');
  }

  // Check for common misconfigurations
  allowedOrigins.forEach((origin) => {
    if (origin.endsWith('/')) {
      errors.push(`Origin should not end with '/': ${origin}`);
    }
    if (origin.includes('*') && origin !== '*') {
      errors.push(`Wildcards not supported in origin list: ${origin}`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ CORS Configuration Errors:');
    errors.forEach((err) => console.error(`  - ${err}`));
    throw new Error('Invalid CORS configuration');
  }

  console.log(`✅ CORS configuration valid (${allowedOrigins.length} origins allowed)`);
  return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = corsMiddleware;
module.exports.corsErrorHandler = corsErrorHandler;
module.exports.validateCorsConfig = validateCorsConfig;
module.exports.isOriginAllowed = isOriginAllowed; // For testing


// // src/middleware/cors.js
// const cors = require('cors');
// const APP_CONFIG = require('../../config');

// const allowedOrigins = [
//       APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,
//       APP_CONFIG.DEFAULT_REDIRECT_URL,
//       APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS,
//       APP_CONFIG.CORS_TRUSTED_ORIGIN,
//   ...(process.env.NODE_ENV === 'development' 
//       ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:3001', 'http://127.0.0.1:3001'] 
//       : [])
//     ].filter(Boolean);

// const corsOptions = {
//   origin: (origin, callback) => {
//   // Allow requests with no origin (mobile apps, Postman, etc.)
//   if (!origin) return callback(null, true);
  
//   // Check allowed origins
//   if (allowedOrigins.includes(origin)) {
//     return callback(null, true);
//   }
  
//   // Development: allow localhost
//   if (process.env.NODE_ENV === 'development') {
//     if (typeof origin === 'string' && 
//         (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
//       return callback(null, true);
//     }
//   }
  
//   // Reject all others
//   console.warn(`CORS blocked request from origin: ${origin}`);
//   return callback(new Error(`CORS blocked for origin: ${origin}`), false);
// },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: [
//     'Content-Type', 
//     'Authorization', 
//     'X-Requested-With',
//     'Accept',
//     'Origin',
//     'Access-Control-Request-Method',
//     'Access-Control-Request-Headers'
//   ],
//   exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
//   credentials: true,
//   maxAge: 86400, // 24 hours
//   preflightContinue: false,
//   optionsSuccessStatus: 200
// };

// const corsMiddleware = cors(corsOptions);

// module.exports = corsMiddleware;
// const cors = require('cors');
// const APP_CONFIG = require('../../config');
// const corsOptions = {
//   origin: [APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,APP_CONFIG.DEFAULT_REDIRECT_URL, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// };

// const corsMiddleware = cors(corsOptions);

// module.exports = corsMiddleware;
