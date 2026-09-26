const crypto = require('crypto');
const { notFound } = require('../utils/errors');
const { STATUSES } = require('../utils/validators');

function createTaskService({ store, metrics }) {
  function findOwned(userId, taskId) {
    const task = store.findTask(taskId);
    if (!task || task.ownerId !== userId) throw notFound('task not found');
    return task;
  }

  function create(userId, input) {
    const now = new Date().toISOString();
    const task = store.insertTask({
      id: crypto.randomUUID(),
      ownerId: userId,
      title: input.title,
      description: input.description || '',
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      dueDate: input.dueDate || null,
      createdAt: now,
      updatedAt: now,
    });
    metrics?.tasksCreated.inc();
    return task;
  }

  function list(userId, filters = {}) {
    const matches = (task) =>
      task.ownerId === userId && Object.entries(filters).every(([key, value]) => task[key] === value);
    return store.listTasks(matches).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function get(userId, taskId) {
    return findOwned(userId, taskId);
  }

  function update(userId, taskId, changes) {
    findOwned(userId, taskId);
    return store.updateTask(taskId, { ...changes, updatedAt: new Date().toISOString() });
  }

  function remove(userId, taskId) {
    findOwned(userId, taskId);
    store.deleteTask(taskId);
  }

  function stats(userId, now = new Date()) {
    const tasks = list(userId);
    const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
    let overdue = 0;
    for (const task of tasks) {
      byStatus[task.status] += 1;
      if (task.dueDate && task.status !== 'done' && new Date(task.dueDate) < now) overdue += 1;
    }
    return { total: tasks.length, byStatus, overdue };
  }

  return { create, list, get, update, remove, stats };
}

module.exports = { createTaskService };
