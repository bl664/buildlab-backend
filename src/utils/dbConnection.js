const { Pool } = require('pg');
const APP_CONFIG = require('../../config');

const pool = new Pool({
  user: APP_CONFIG.USERNAME,
  host: APP_CONFIG.HOST,
  database: APP_CONFIG.DATABASE,
  password: APP_CONFIG.PASSWORD,
  port: APP_CONFIG.DB_PORT,

  max: 20, // max active connections
  min: 2,  // min idle connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 5000, // error if connection not available after 5s
  statement_timeout: 30000, // 30s max per query
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  application_name: `${APP_CONFIG.APP_NAME || 'auth-service'}_${process.env.NODE_ENV || 'development'}`,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // crash safely in production
});

module.exports = pool;
