const { AuditLog } = require('../../models');
const logger = require('../../config/logger');

// Every important action generates an Audit Log (DMBR Global Business Principle).
// Best-effort: a logging failure must never break the primary request.
async function recordAudit({ organizationId, userId, action, resource, resourceId, req, metadata = {} }) {
  try {
    await AuditLog.create({
      organizationId: organizationId || null,
      userId: userId || null,
      action,
      resource,
      resourceId: resourceId || null,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      metadata,
    });
  } catch (err) {
    logger.error('Failed to write audit log', { err: err.message, action, resource });
  }
}

module.exports = { recordAudit };
