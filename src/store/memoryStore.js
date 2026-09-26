const crypto = require('crypto');

function createMemoryStore() {
  const users = new Map();
  const usernameIndex = new Map();
  const tasks = new Map();

  return {
    createUser({ username, passwordHash }) {
      const user = { id: crypto.randomUUID(), username, passwordHash, createdAt: new Date().toISOString() };
      users.set(user.id, user);
      usernameIndex.set(username, user.id);
      return { ...user };
    },
    findUserByUsername(username) {
      const id = usernameIndex.get(username);
      return id ? { ...users.get(id) } : undefined;
    },
    findUserById(id) {
      const user = users.get(id);
      return user ? { ...user } : undefined;
    },
    insertTask(task) {
      tasks.set(task.id, { ...task });
      return { ...task };
    },
    findTask(id) {
      const task = tasks.get(id);
      return task ? { ...task } : undefined;
    },
    listTasks(predicate) {
      return [...tasks.values()].filter(predicate).map((task) => ({ ...task }));
    },
    updateTask(id, changes) {
      const updated = { ...tasks.get(id), ...changes };
      tasks.set(id, updated);
      return { ...updated };
    },
    deleteTask(id) {
      return tasks.delete(id);
    },
    ping() {
      return true;
    },
  };
}

module.exports = { createMemoryStore };
