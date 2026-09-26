const { unauthorized } = require('../utils/errors');

function requireAuth(authService) {
  return (req, _res, next) => {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthorized());
    try {
      req.user = authService.verifyToken(token);
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requireAuth };
