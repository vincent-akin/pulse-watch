const AppError = require('../common/AppError');

// Validates req[part] (body/query/params) against a Zod schema, throwing a 422 with field-level errors.
function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || part,
        message: issue.message,
      }));
      return next(AppError.validation(errors));
    }
    req[part] = result.data;
    next();
  };
}

module.exports = { validate };
