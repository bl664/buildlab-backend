const cors = require('cors');
const APP_CONFIG = require('../../config');
console.log(APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,APP_CONFIG.DEFAULT_REDIRECT_URL, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS, APP_CONFIG)
const corsOptions = {
  origin: [APP_CONFIG.MENTOR_REDIRECT_URL_SUCCESS,APP_CONFIG.DEFAULT_REDIRECT_URL, APP_CONFIG.STUDENT_REDIRECT_URL_SUCCESS],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
