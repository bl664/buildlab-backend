const { queryDatabase } = require('./dbQuery');
const logger = require('../utils/logger');

const checkEmailExists = async (email) => {
  try {
    const query = 'SELECT email FROM messaging_users WHERE email = $1';
    const result = await queryDatabase(query, [email]);
    return result.length > 0;
  } catch (error) {
    logger.error('Error checking email existence', { 
      error: error.message, 
      stack: error.stack,
      email 
    });
    throw new Error('Error checking email existence');
  }
};

module.exports = {
  checkEmailExists
};