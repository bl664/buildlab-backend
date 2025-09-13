const validator = require('validator');

const isEmailValid = (email) => {
  return validator.isEmail(email);
};

module.exports = { isEmailValid };
