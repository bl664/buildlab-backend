const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../../../services/dbQuery');


router.get('/', async (req, res) => {
  console.log("getting info", req.user);
  const user_id = req.user.id;

  if (!user_id) {
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  try {
    const query = `
      SELECT name, email, role, user_id AS id
      FROM messaging_users 
      WHERE user_id = $1
      LIMIT 1;
    `;
    const values = [user_id];

    const result = await queryDatabase(query, values);

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result[0];
// console.log("fetched user info", user);
    return res.json({
      message: 'fetched',
      result: user,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;    