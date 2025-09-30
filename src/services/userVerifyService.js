const { queryDatabase } = require('./dbQuery');

const checkEmailExists = async (email, client = null) => {
  const query = 'SELECT email FROM messaging_users WHERE LOWER(email) = LOWER($1)';
  const result = await queryDatabase(query, [email], client);
  return result.length > 0;
};


module.exports = {
  checkEmailExists
};