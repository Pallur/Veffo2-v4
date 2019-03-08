const express = require('express');

/* todo importa frá todos.js */

const {
  list,
  findByID,
  insert,
  updateByID,
  deleteByID,
} = require('./todos');

const router = express.Router();

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/* todo útfæra vefþjónustuskil */

async function listRoute(req, res) {
  const { order, completed } = req.query;
  const result = await list(order, completed);

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Page not found' });
  }

  if (!result.success && result.length === 0) {
    return res.status(400).json({ error: 'List not available' });
  }

  return res.status(200).json(result);
}

async function findID(req, res) {
  const { id } = req.params;
  const result = await findByID(id);

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Id not found' });
  }

  if (!result.success && result.length === 0) {
    return res.status(400).json({ error: 'Verkefnið ekki til' });
  }

  return res.status(200).json(result);
}

async function postNew(req, res) {
  const { title, position, completed, due } = req.body;
  const result = await insert(title, position, completed, due);

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }
  return res.status(200).json(result);
}

async function updateID(req, res) {
  const { id } = req.params;
  const { title, position, due, completed } = req.body;

  const result = await updateByID(id,
    { title, position, due, completed });

  if (!result.success && result.notFound) {
    return res.status(404).json(result.validation);
  }

  return res.status(200).json(result.item);
}

async function deleteID(req, res) {
  const { id } = req.params;
  const result = await deleteByID(id);

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Id not found' });
  }

  if (!result.success && result.length === 0) {
    return res.status(400).json({ error: 'Verkefnið ekki til' });
  }

  return res.status(200).json(result);
}

router.get('/', catchErrors(listRoute));
router.get('/:id', catchErrors(findID));
router.post('/', catchErrors(postNew));
router.patch('/:id', catchErrors(updateID));
router.delete('/:id', catchErrors(deleteID));

module.exports = router;
