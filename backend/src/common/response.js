function ok(res, { message = 'Success', data = {}, meta = undefined, status = 200 } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, opts = {}) {
  return ok(res, { status: 201, message: 'Created successfully.', ...opts });
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, { message = 'Request failed.', errors = [], status = 400 } = {}) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { ok, created, noContent, fail };
