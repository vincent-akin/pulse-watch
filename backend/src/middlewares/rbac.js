const AppError = require('../common/AppError');
const asyncHandler = require('../common/asyncHandler');
const OrganizationMember = require('../models/OrganizationMember');

// Role hierarchy: owner > admin > engineer > viewer.
const RANK = { owner: 4, admin: 3, engineer: 2, viewer: 1 };

// Resolves the caller's membership for req.organizationId and enforces a minimum role.
// API-key auth is treated as an "admin"-equivalent, organization-scoped principal.
function requireRole(minRole) {
  return asyncHandler(async (req, res, next) => {
    if (!req.organizationId) {
      throw AppError.badRequest('X-Organization-ID header (or organization context) is required.');
    }

    if (req.authType === 'apiKey') {
      if (req.apiKey.organizationId.toString() !== req.organizationId) {
        throw AppError.forbidden('API key does not belong to this organization.');
      }
      req.membership = { role: 'admin' };
      return next();
    }

    const membership = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      userId: req.user._id,
      status: 'active',
      deletedAt: null,
    });

    if (!membership) throw AppError.forbidden('You are not a member of this organization.');
    if (RANK[membership.role] < RANK[minRole]) {
      throw AppError.forbidden(`Requires role '${minRole}' or higher.`);
    }

    req.membership = membership;
    next();
  });
}

module.exports = { requireRole, RANK };
