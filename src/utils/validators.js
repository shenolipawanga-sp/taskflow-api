const { badRequest } = require('./errors');

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const USERNAME_PATTERN = /^\w{3,30}$/;

function fail(message) {
  throw badRequest(message);
}

function validateCredentials(body) {
  const { username, password } = body || {};
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    fail('username must be 3-30 letters, numbers or underscores');
  }
  // bcrypt only uses the first 72 bytes, so longer passwords are rejected
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    fail('password must be between 8 and 72 characters');
  }
  return { username: username.toLowerCase(), password };
}

const FIELD_RULES = {
  title(value) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 100) {
      fail('title must be between 1 and 100 characters');
    }
    return value.trim();
  },
  description(value) {
    if (typeof value !== 'string' || value.length > 500) {
      fail('description must be text of up to 500 characters');
    }
    return value.trim();
  },
  status(value) {
    if (!STATUSES.includes(value)) fail(`status must be one of: ${STATUSES.join(', ')}`);
    return value;
  },
  priority(value) {
    if (!PRIORITIES.includes(value)) fail(`priority must be one of: ${PRIORITIES.join(', ')}`);
    return value;
  },
  dueDate(value) {
    if (value === null) return null;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      fail('dueDate must be an ISO 8601 date');
    }
    return new Date(value).toISOString();
  },
};

function checkTaskShape(body, partial) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail('request body must be a JSON object');
  }
  const keys = Object.keys(body);
  const unknown = keys.filter((key) => !Object.hasOwn(FIELD_RULES, key));
  if (unknown.length > 0) fail(`unknown field(s): ${unknown.join(', ')}`);
  if (!partial && body.title === undefined) fail('title is required');
  if (partial && keys.length === 0) fail('at least one field must be provided');
  return keys;
}

function validateTask(body, { partial = false } = {}) {
  const keys = checkTaskShape(body, partial);
  const clean = {};
  for (const key of keys) clean[key] = FIELD_RULES[key](body[key]);
  return clean;
}

function validateTaskFilters(query = {}) {
  const filters = {};
  if (query.status !== undefined) filters.status = FIELD_RULES.status(query.status);
  if (query.priority !== undefined) filters.priority = FIELD_RULES.priority(query.priority);
  return filters;
}

module.exports = { validateCredentials, validateTask, validateTaskFilters, STATUSES, PRIORITIES };
