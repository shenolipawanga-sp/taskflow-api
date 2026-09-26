const { createMemoryStore } = require('../../src/store/memoryStore');
const { createTaskService } = require('../../src/services/taskService');

function setup() {
  const metrics = { tasksCreated: { inc: jest.fn() } };
  const service = createTaskService({ store: createMemoryStore(), metrics });
  return { service, metrics };
}

describe('taskService', () => {
  test('creates a task with sensible defaults and counts it', () => {
    const { service, metrics } = setup();
    const task = service.create('u1', { title: 'Plan sprint' });
    expect(task).toMatchObject({ ownerId: 'u1', title: 'Plan sprint', status: 'todo', priority: 'medium', dueDate: null });
    expect(metrics.tasksCreated.inc).toHaveBeenCalledTimes(1);
  });

  test('works without a metrics object', () => {
    const service = createTaskService({ store: createMemoryStore() });
    expect(service.create('u1', { title: 'No metrics' }).title).toBe('No metrics');
  });

  test('lists only the owner\'s tasks and applies filters', () => {
    const { service } = setup();
    service.create('u1', { title: 'A', priority: 'high' });
    service.create('u1', { title: 'B', priority: 'low' });
    service.create('u2', { title: 'C', priority: 'high' });
    expect(service.list('u1')).toHaveLength(2);
    expect(service.list('u1', { priority: 'high' }).map((t) => t.title)).toEqual(['A']);
  });

  test('updates a task and refreshes updatedAt', async () => {
    const { service } = setup();
    const task = service.create('u1', { title: 'Old' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = service.update('u1', task.id, { title: 'New', status: 'done' });
    expect(updated).toMatchObject({ title: 'New', status: 'done' });
    expect(updated.updatedAt > task.updatedAt).toBe(true);
  });

  test('hides other users\' tasks behind a not found error', () => {
    const { service } = setup();
    const task = service.create('u1', { title: 'Private' });
    expect(() => service.get('u2', task.id)).toThrow(/task not found/);
    expect(() => service.update('u2', task.id, { title: 'x' })).toThrow(/task not found/);
    expect(() => service.remove('u2', task.id)).toThrow(/task not found/);
  });

  test('removes a task', () => {
    const { service } = setup();
    const task = service.create('u1', { title: 'Temp' });
    service.remove('u1', task.id);
    expect(() => service.get('u1', task.id)).toThrow(/task not found/);
  });

  test('builds stats including overdue tasks', () => {
    const { service } = setup();
    service.create('u1', { title: 'Late', dueDate: '2026-01-01T00:00:00.000Z' });
    service.create('u1', { title: 'Late but done', status: 'done', dueDate: '2026-01-01T00:00:00.000Z' });
    service.create('u1', { title: 'Future', status: 'in_progress', dueDate: '2027-01-01T00:00:00.000Z' });
    const stats = service.stats('u1', new Date('2026-06-01T00:00:00.000Z'));
    expect(stats).toEqual({ total: 3, byStatus: { todo: 1, in_progress: 1, done: 1 }, overdue: 1 });
  });
});
