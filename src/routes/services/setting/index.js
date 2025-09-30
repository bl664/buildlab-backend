const express = require('express');
const router = express.Router();

const updateDetails = require('./updateDetails');
const updatePassword = require('./updatePassword');
const fetchUserDetails = require('./fetchUserDetails');

router.use('/profile-details', updateDetails);
router.use('/password', updatePassword);
router.use('/user-details', fetchUserDetails);

module.exports = router;
