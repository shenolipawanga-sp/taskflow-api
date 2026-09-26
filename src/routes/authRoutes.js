const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { validateCredentials } = require('../utils/validators');

function createAuthRouter({ authService, metrics }) {
  const router = express.Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const user = await authService.register(validateCredentials(req.body));
    metrics.usersRegistered.inc();
    res.status(201).json(user);
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    res.json(await authService.login(validateCredentials(req.body)));
  }));

  return router;
}

module.exports = { createAuthRouter };
