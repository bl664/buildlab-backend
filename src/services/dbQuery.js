const pool = require('../utils/dbConnection');

const queryDatabase = async (query, params = [], client = null) => {
  const db = client || pool;
  
  try {
    const { rows } = await db.query(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error', {
      query,
      params,
      error: error.message,
      stack: error.stack,
    });
    throw error; 
  }
};

// Helper to get a single client for transaction
const getTransactionClient = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return client;
  } catch (error) {
    // If BEGIN fails, release the client
    client.release();
    throw error;
  }
};

const commitTransaction = async (client) => {
  try {
    await client.query('COMMIT');
  } catch (error) {
    // If commit fails, try to rollback
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to rollback after commit failure', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
};

// Helper to safely rollback a transaction
const rollbackTransaction = async (client) => {
  if (!client.released) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
      client.released = true;  // mark so no double release
    }
  }
};

// Execute multiple queries in a transaction with automatic rollback on failure
const executeTransaction = async (queries) => {
  const client = await getTransactionClient();
  const results = [];
  
  try {
    for (const { query, params = [] } of queries) {
      const result = await queryDatabase(query, params, client);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};


module.exports = {
  queryDatabase,
  getTransactionClient,
  commitTransaction,
  rollbackTransaction,
  executeTransaction
};

