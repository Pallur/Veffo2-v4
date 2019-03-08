const xss = require('xss');
const validator = require('validator');
const { query } = require('./db');

/**
 * Shows the list, in ascending / descending order and/or
 * if it's completed or not.
 *
 * @param {String} order Order of the list
 * @param {boolean} completed Completed or not
 * @returns {object}
 */
async function list(order = 'ASC', completed) {
  const queryString = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';


  if (completed === 'true' || completed === 'false') {
    const q = `
    SELECT * 
    FROM verkefni 
    WHERE completed = $1
    ORDER BY position ${queryString}`;
    const result = await query(q, [completed]);
    return result.rows;
  }

  const q = `
    SELECT *
    FROM verkefni
    ORDER BY position ${queryString}`;

  const result = await query(q, completed);
  return result.rows;
}

/**
 * Find a specific item by its id
 *
 * @param {number} id Id of item to find
 * @returns {object}
 */
async function findByID(id) {
  const q = 'SELECT * FROM verkefni WHERE id = $1';
  const result = await query(q, [id]);
  return result.rows;
}

function isEmpty(s) {
  return s == null && !s;
}

function validate(title, due, position, completed) {
  const errors = [];

  if (!isEmpty(title)) {
    if (typeof title !== 'string' || title.length === 0 || title.length > 128) {
      errors.push({
        field: 'title',
        error: 'Titill verður að vera strengur sem er 1 til 128 stafir',
      });
    }
  }

  if (!isEmpty(due)) {
    if (!validator.isISO8601(due)) {
      errors.push({
        field: 'due',
        error: 'Dagsetning verður að vera gild ISO 8601 dagsetning',
      });
    }
  }

  const pos = parseInt(position, 10);
  if (!isEmpty(position)) {
    if (typeof pos === 'object' || pos < 0 || isNaN(pos)) { // eslint-disable-line
      errors.push({
        field: 'position',
        error: 'Staðsetning verður að vera heiltala stærri eða jöfn 0',
      });
    }
  }

  if (typeof completed !== 'boolean') {
    errors.push({
      field: 'completed',
      error: 'Lokið verður að vera boolean gildi',
    });
  }


  return errors;
}

/**
 * Inserts a new json into server.
 *
 * @param {string} title Title of item to insert
 * @param {number} position Position to insert
 * @param {boolean} completed Completed to insert
 * @param {string} due Due to insert
 * @returns {object}
 */
async function insert(title, position, completed = false, due) {
  const validationResult = await validate(title, position, completed, due);

  if (validationResult.length > 0) {
    return {
      success: false,
      notFound: false,
      validation: validationResult,
    };
  }

  const changedValues = [xss(title), xss(position), xss(due), completed];

  const q = `
    INSERT INTO verkefni
    (title, position, due, completed)
    VALUES ($1, $2, $3, $4)
    RETURNING id, title, position, due, created, updated, completed`;

  const item = await query(q, changedValues);

  return {
    success: true,
    item: item.rows,
  };
}

/**
 * Updates an item, either its title, duedate,
 * position, completion or all of the above.
 *
 * @param {number} id Id of item to update
 * @param {object} item Item to update
 * @returns {object}
 */
async function updateByID(id, item) {
  const result = await query('SELECT * FROM verkefni where id = $1', [id]);

  if (!result) {
    return { error: 'Item not found' };
  }

  if (result.rows.length === 0) {
    return {
      success: false,
      notFound: true,
      validation: [],
    };
  }

  const validationResult = await validate(
    item.title,
    item.due,
    item.position,
    item.completed,
  );

  if (validationResult.length > 0) {
    return {
      success: false,
      notFound: false,
      validation: validationResult,
    };
  }

  const changedColumns = [
    !isEmpty(item.title) ? 'title' : null,
    !isEmpty(item.position) ? 'position' : null,
    !isEmpty(item.due) ? 'due' : null,
    !isEmpty(item.created) ? 'created' : null,
  ].filter(Boolean);

  const changedValues = [
    !isEmpty(item.title) ? xss(item.title) : null,
    !isEmpty(item.position) ? xss(item.position) : null,
    !isEmpty(item.due) ? xss(item.due) : null,
    // !isEmpty(item.completed) ? xss(item.completed) : null,
  ].filter(Boolean);

  const updates = [id, ...changedValues];
  const updatedColumnsQuery = changedColumns
    .map((column, i) => `${column} = $${i + 2}`);

  console.log(updates); // eslint-disable-line
  console.log(updatedColumnsQuery); // eslint-disable-line

  const q = `
    UPDATE verkefni
    SET ${updatedColumnsQuery.join(', ')}
    WHERE id = $1
    RETURNING id, title, position, due, created, updated, completed`;

  console.log(q); // eslint-disable-line

  const updateResults = await query(q, updates);

  console.log(updateResults); // eslint-disable-line

  return {
    success: true,
    item: updateResults.rows[0],
  };
}

/**
 * Deletes an item.
 *
 * @param {number} id Id of item to delete
 * @returns {object}
 */
async function deleteByID(id) {
  if (typeof id !== 'number') {
    return {
      success: false,
      notFound: true,
      validation: [],
    };
  }

  const q = 'DELETE * FROM verkefni WHERE id = $1';
  const result = await query(q, [id]);
  return result.rows;
}

module.exports = {
  list,
  findByID,
  insert,
  updateByID,
  deleteByID,
};
