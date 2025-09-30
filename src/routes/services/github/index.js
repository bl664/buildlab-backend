const express = require('express');
const router = express.Router();

const login = require('../../../api/github/login/route');
const callback = require('../../../api/github/callback/route');
const addCollaborator = require('../../../api/github/add-collaborator/route');
const disconnect = require('./disconenctGithub');
const checkConnection = require('./checkGitHubConnection');

router.use('/github/login', login);
router.use('/auth/github/callback', callback);
router.use('/github/add-collaborator', addCollaborator);
router.use('/github/disconnect', disconnect);
router.use('/github/check-connection', checkConnection);

module.exports = router;
