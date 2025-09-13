const { queryDatabase } = require('./dbQuery');

const checkEmailExists = async (email) => {
  try {
    const query = 'SELECT email FROM messaging_users WHERE email = $1';
    const result = await queryDatabase(query, [email]);
    return result.length > 0;
  } catch (error) {
    throw new Error('Error checking email existence');
  }
};

module.exports = {
  checkEmailExists
};