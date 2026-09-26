const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { conflict, unauthorized } = require('../utils/errors');

function createAuthService({ store, config }) {
  async function register({ username, password }) {
    if (store.findUserByUsername(username)) throw conflict('username is already taken');
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = store.createUser({ username, passwordHash });
    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  async function login({ username, password }) {
    const user = store.findUserByUsername(username);
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid) throw unauthorized('invalid username or password');

    const token = jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn,
    });
    return { token, tokenType: 'Bearer', expiresIn: config.jwtExpiresIn };
  }

  function verifyToken(token) {
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw unauthorized('invalid or expired token');
    }
    const user = store.findUserById(payload.sub);
    if (!user) throw unauthorized('user no longer exists');
    return { id: user.id, username: user.username };
  }

  return { register, login, verifyToken };
}

module.exports = { createAuthService };
