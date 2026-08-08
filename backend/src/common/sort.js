// Parses `sort=field:asc|desc` into a Mongoose sort object. Falls back to createdAt desc.
function parseSort(sortParam, allowedFields = ['createdAt'], fallback = { createdAt: -1 }) {
  if (!sortParam) return fallback;
  const [field, dir] = sortParam.split(':');
  if (!allowedFields.includes(field)) return fallback;
  return { [field]: dir === 'asc' ? 1 : -1 };
}

module.exports = { parseSort };
