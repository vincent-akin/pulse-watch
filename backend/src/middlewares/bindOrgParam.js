// For routes where the organization is identified by a URL param (e.g. /organizations/:id,
// /monitors/:id via lookup), this binds req.organizationId so requireRole() can use it uniformly.
module.exports = function bindOrgParam(paramName = 'id') {
  return (req, res, next) => {
    req.organizationId = req.params[paramName];
    next();
  };
};
