const jwt = require('jsonwebtoken');
const { createMemoryStore } = require('../../src/store/memoryStore');
const { createAuthService } = require('../../src/services/authService');

const config = { jwtSecret: 'unit-secret', jwtExpiresIn: '1h', bcryptRounds: 4 };

function setup() {
  const store = createMemoryStore();
  return { store, auth: createAuthService({ store, config }) };
}

describe('authService', () => {
  test('registers a user without exposing the password hash', async () => {
    const { auth, store } = setup();
    const user = await auth.register({ username: 'bob', password: 'Password123' });
    expect(user).toEqual({ id: expect.any(String), username: 'bob', createdAt: expect.any(String) });
    expect(store.findUserByUsername('bob').passwordHash).not.toBe('Password123');
  });

  test('refuses a duplicate username', async () => {
    const { auth } = setup();
    await auth.register({ username: 'bob', password: 'Password123' });
    await expect(auth.register({ username: 'bob', password: 'Other-pass-1' })).rejects.toMatchObject({ status: 409 });
  });

  test('logs in and issues a token that verifies', async () => {
    const { auth } = setup();
    await auth.register({ username: 'bob', password: 'Password123' });
    const { token, tokenType } = await auth.login({ username: 'bob', password: 'Password123' });
    expect(tokenType).toBe('Bearer');
    expect(auth.verifyToken(token)).toMatchObject({ username: 'bob' });
  });

  test('rejects a wrong password and an unknown user with the same message', async () => {
    const { auth } = setup();
    await auth.register({ username: 'bob', password: 'Password123' });
    await expect(auth.login({ username: 'bob', password: 'wrong-pass' })).rejects.toThrow('invalid username or password');
    await expect(auth.login({ username: 'nobody', password: 'Password123' })).rejects.toThrow('invalid username or password');
  });

  test('rejects tampered, expired and orphaned tokens', async () => {
    const { auth } = setup();
    const user = await auth.register({ username: 'bob', password: 'Password123' });
    const forged = jwt.sign({ sub: user.id }, 'some-other-secret');
    const expired = jwt.sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) - 60 }, config.jwtSecret);
    const orphan = jwt.sign({ sub: 'missing-user' }, config.jwtSecret);
    expect(() => auth.verifyToken(forged)).toThrow(/invalid or expired/);
    expect(() => auth.verifyToken(expired)).toThrow(/invalid or expired/);
    expect(() => auth.verifyToken(orphan)).toThrow(/no longer exists/);
  });
});
