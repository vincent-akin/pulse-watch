const { v4: uuidv4 } = require('uuid');

// Every request/response carries X-Request-ID for cross-log correlation (client-supplied or server-generated).
module.exports = function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.requestId = incoming && String(incoming).trim() ? String(incoming).trim() : uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};
