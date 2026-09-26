const { validateCredentials, validateTask, validateTaskFilters } = require('../../src/utils/validators');

describe('validateCredentials', () => {
  test('accepts valid credentials and lower-cases the username', () => {
    expect(validateCredentials({ username: 'Alice_01', password: 'longenough' }))
      .toEqual({ username: 'alice_01', password: 'longenough' });
  });

  test.each([
    [{ username: 'ab', password: 'longenough' }, /username/],
    [{ username: 'bad name', password: 'longenough' }, /username/],
    [{ username: 'alice', password: 'short' }, /password/],
    [{ username: 'alice', password: 'x'.repeat(73) }, /password/],
    [undefined, /username/],
  ])('rejects %j', (body, message) => {
    expect(() => validateCredentials(body)).toThrow(message);
  });
});

describe('validateTask', () => {
  test('trims and normalises a full task', () => {
    const task = validateTask({
      title: '  Write report ',
      description: ' draft ',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-10',
    });
    expect(task).toEqual({
      title: 'Write report',
      description: 'draft',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-10T00:00:00.000Z',
    });
  });

  test('requires a title on create', () => {
    expect(() => validateTask({ priority: 'low' })).toThrow(/title is required/);
  });

  test('allows partial updates and clearing the due date', () => {
    expect(validateTask({ dueDate: null }, { partial: true })).toEqual({ dueDate: null });
  });

  test('rejects an empty partial update', () => {
    expect(() => validateTask({}, { partial: true })).toThrow(/at least one field/);
  });

  test('rejects unknown fields, including prototype keys', () => {
    expect(() => validateTask({ title: 'x', ownerId: 'someone' })).toThrow(/unknown field/);
    expect(() => validateTask(JSON.parse('{"title":"x","constructor":1}'))).toThrow(/unknown field/);
  });

  test.each([
    [{ title: '' }, /title/],
    [{ title: 'x'.repeat(101) }, /title/],
    [{ title: 'ok', description: 5 }, /description/],
    [{ title: 'ok', status: 'finished' }, /status/],
    [{ title: 'ok', priority: 'urgent' }, /priority/],
    [{ title: 'ok', dueDate: 'next tuesday' }, /dueDate/],
    [[], /JSON object/],
    [null, /JSON object/],
  ])('rejects invalid input %j', (body, message) => {
    expect(() => validateTask(body)).toThrow(message);
  });
});

describe('validateTaskFilters', () => {
  test('returns only the filters that were supplied', () => {
    expect(validateTaskFilters({ status: 'done' })).toEqual({ status: 'done' });
    expect(validateTaskFilters()).toEqual({});
  });

  test('rejects an invalid filter value', () => {
    expect(() => validateTaskFilters({ priority: 'extreme' })).toThrow(/priority/);
  });
});
