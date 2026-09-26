const express = require('express');
const { validateTask, validateTaskFilters } = require('../utils/validators');

function createTaskRouter({ taskService }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(taskService.list(req.user.id, validateTaskFilters(req.query)));
  });

  router.get('/stats', (req, res) => {
    res.json(taskService.stats(req.user.id));
  });

  router.post('/', (req, res) => {
    res.status(201).json(taskService.create(req.user.id, validateTask(req.body)));
  });

  router.get('/:id', (req, res) => {
    res.json(taskService.get(req.user.id, req.params.id));
  });

  router.patch('/:id', (req, res) => {
    res.json(taskService.update(req.user.id, req.params.id, validateTask(req.body, { partial: true })));
  });

  router.delete('/:id', (req, res) => {
    taskService.remove(req.user.id, req.params.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { createTaskRouter };
