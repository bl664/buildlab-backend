const Snowflake = require('snowflake-id').default;

// Initialize Snowflake generators
const storeSnowflake = new Snowflake({
  mid: 1, // Machine ID (0-1023)
  offset: (new Date('2024-01-01')).getTime(), // Custom epoch
});
const userSnowflake = new Snowflake({
  mid: 2, // Different Machine ID (0-1023)
  offset: (new Date('2024-01-01')).getTime(), // Custom epoch
});

const generateUserId = () => {
  return userSnowflake.generate().toString();
};

const generateStoreId = () => {
  return `store_${storeSnowflake.generate().toString()}`;
};

module.exports = { generateUserId, generateStoreId };
