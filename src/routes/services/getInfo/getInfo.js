const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  console.log("getting info");
  const user_id = req.user.userId;

  try {
    const query = `
      SELECT name, email, role, user_id AS id
      FROM messaging_users 
      WHERE user_id = $1;
    `;
    const values = [user_id];

    const result = await queryDatabase(query, values);

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result[0];
    console.log("user is", user);

    return res.json({
      message: 'fetched',
      result: user,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
