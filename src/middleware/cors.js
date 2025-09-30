// src/middleware/cors.js
const cors = require('cors');
const APP_CONFIG = require('../../config');
console.log(APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,APP_CONFIG.DEFAULT_REDIRECT_URL, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS, APP_CONFIG)

// Enhanced CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,
      APP_CONFIG.DEFAULT_REDIRECT_URL,
      APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS,
      APP_CONFIG.CORS_TRUSTED_ORIGIN,
  ...(process.env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:3001', 'http://127.0.0.1:3001'] 
      : [])
    ].filter(Boolean); // Remove undefined/null values

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (typeof origin === 'string' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
    }

    // Log unauthorized CORS attempts
    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
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
