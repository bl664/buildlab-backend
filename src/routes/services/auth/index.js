const express = require('express');
const router = express.Router();

const signin = require('./signin');
const signup = require('./signup');
const logout = require('./logout');
const verifyEmail = require('./verify')
router.use('/signin', signin);
router.use('/signup', signup);
router.use('/verify/email', verifyEmail)
router.use('/logout', logout);

module.exports = router;
