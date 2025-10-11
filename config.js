const { config } = require('dotenv');
const path = require('path');

// Determine which .env file to load based on NODE_ENV
let envFileName = '.env.production'; // Default to development
if (process.env.NODE_ENV === 'production') {
    console.log('Loading .env.production');
    envFileName = '.env.production';
} else if (process.env.NODE_ENV === 'test') {
    console.log('Loading .env.test');
    envFileName = '.env.test';
}

// Load the appropriate .env file
const envFilePath = path.resolve(process.cwd(), envFileName);
config({ path: envFilePath });

const APP_CONFIG = {
    SERVER_PORT: process.env.SERVER_PORT,
    HOST: process.env.HOST,
    USERNAME: process.env.USERNAME,
    PASSWORD: process.env.PASSWORD,
    DATABASE: process.env.DATABASE,
    DB_PORT: process.env.DB_PORT,
    CORS_TRUSTED_ORIGIN: process.env.CORS_TRUSTED_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_FILE_DIRECTORY: process.env.LOG_FILE_DIRECTORY,
    LOG_FILE_NAME: process.env.LOG_FILE_NAME,
    BL_AUTH_JWT_TOKEN_NAME: process.env.BL_AUTH_JWT_TOKEN_NAME,
    SECRET_KEY: process.env.AUTH_SECRET_KEY,
    BL_AUTH_COOKIE_NAME: process.env.BL_AUTH_COOKIE_NAME,
    BL_AUTH_SECRET_KEY: process.env.BL_AUTH_SECRET_KEY,
    BL_AUTH_COOKIE_HTTP_ONLY: process.env.BL_AUTH_COOKIE_HTTP_ONLY,
    BL_AUTH_COOKIE_HTTP_ONLY: process.env.BL_AUTH_COOKIE_HTTP_ONLY,
    BL_AUTH_COOKIE_SECURE: process.env.BL_AUTH_COOKIE_SECURE,
    BL_AUTH_COOKIE_SAME_SITE: process.env.BL_AUTH_COOKIE_SAME_SITE,
    BL_AUTH_COOKIE_ALLOWED_DOMAIN: process.env.BL_AUTH_COOKIE_ALLOWED_DOMAIN,
    BL_AUTH_COOKIE_MAXAGE: process.env.BL_AUTH_COOKIE_MAXAGE,
    GITHUB_CLIENT_SECRET: process.env.BL_AUTH_GITHUB_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.BL_AUTH_GITHUB_CLIENT_ID,
    STUDENT_REDIRECT_URL_SUCCESS: process.env.BL_AUTH_STUDENT_REDIRECT_URL_SUCCESS,
    MENTOR_REDIRECT_URL_SUCCESS: process.env.BL_AUTH_MENTOR_REDIRECT_URL_SUCCESS,
    DEFAULT_REDIRECT_URL: process.env.BL_AUTH_DEFAULT_REDIRECT_URL,
    GITHUB_REDIRECT_URL: process.env.BL_AUTH_GITHUB_REDIRECT_URL,
    BL_AUTH_REFRESH_COOKIE_MAXAGE : process.env.BL_AUTH_REFRESH_COOKIE_MAXAGE,
    EMAIL_HOST: process.env.BL_AUTH_EMAIL_HOST,
    EMAIL_PORT: process.env.BL_AUTH_EMAIL_PORT,
    EMAIL_USER: process.env.BL_AUTH_EMAIL_USER,
    EMAIL_PASS: process.env.BL_AUTH_EMAIL_PASS,
    FRONTEND_URL: process.env.BL_AUTH_FRONTEND_URL,
    BL_AUTH_REFRESH_COOKIE_NAME: process.env.BL_AUTH_REFRESH_COOKIE_NAME
}

module.exports = APP_CONFIG