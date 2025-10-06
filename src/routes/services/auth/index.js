const express = require('express');
const router = express.Router();

const signin = require('./signin');
const signup = require('./signup');
const logout = require('./logout');
const forgot_password = require('./forgotPassword')
const reset_password = require('./resetPassword')
const verifyEmail = require('./verify')
router.use('/signin', signin);
router.use('/signup', signup);
router.use('/verify/email', verifyEmail)
router.use('/logout', logout);
router.use('/forgot-password', forgot_password)
router.use('/reset-password', reset_password)

module.exports = router;
