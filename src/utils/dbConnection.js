const { Pool } = require('pg');
const APP_CONFIG = require('../../config');

const pool = new Pool({
  user: APP_CONFIG.USERNAME,
  host: APP_CONFIG.HOST,
  database: APP_CONFIG.DATABASE,
  password: APP_CONFIG.PASSWORD,
  port: APP_CONFIG.DB_PORT,
});

module.exports = pool;
