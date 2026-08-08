const { Buffer } = require('buffer');

// Offset pagination — used by most resources.
function parseOffsetPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function buildOffsetMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

// Cursor pagination — health-checks only. Cursor encodes { id, completedAt }.
function encodeCursor(doc) {
  const payload = JSON.stringify({ id: doc._id.toString(), completedAt: doc.completedAt });
  return Buffer.from(payload, 'utf8').toString('base64');
}

function decodeCursor(cursor) {
  try {
    const payload = Buffer.from(cursor, 'base64').toString('utf8');
    const { id, completedAt } = JSON.parse(payload);
    return { id, completedAt: new Date(completedAt) };
  } catch {
    return null;
  }
}

module.exports = { parseOffsetPagination, buildOffsetMeta, encodeCursor, decodeCursor };
