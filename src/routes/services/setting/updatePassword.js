const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth');
const { queryDatabase } = require('../../../services/dbQuery');
//router.use(authMiddleware);
const bcrypt = require('bcryptjs');

router.put('/', async (req, res) => {
    console.log("yes update pasword");

    const newReq = JSON.parse(JSON.stringify(req.user));
    const user_id = req.user.id

    try {
        const { oldPassword, newPassword } = req.body;
        console.log("req.body", req.body, oldPassword, newPassword)

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new password are required.' });
          }
        
        
          const userResult = await queryDatabase('SELECT password_hash FROM users WHERE id = $1', [user_id]);
          const user = userResult[0];
      
          if (!user) {
            return res.status(404).json({ message: 'User not found.' });
          }
      console.log("userResult", user);
          const isMatch = await bcrypt.compare(oldPassword, user.password_hash); 

          if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
          }
      
          // 3. Hash the new password
          const newHashedPassword = await bcrypt.hash(newPassword, 10);
      
          // 4. Update the password
          await queryDatabase(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newHashedPassword, user_id]
          );
      
          return res.status(200).json({ message: 'Password updated successfully.' });
        } catch (error) {
            queryDatabase('ROLLBACK');
          console.error('Error updating password:', error);
          return res.status(500).json({ message: 'Internal server error.' });
        }
});

module.exports = router;