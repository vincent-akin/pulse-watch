const mongoose = require('mongoose');

// Adds createdAt/updatedAt (via timestamps) + deletedAt, and a soft-delete helper.
// Collections that are append-only/immutable (healthChecks, auditLogs) do NOT use this plugin.
function softDeletable(schema) {
  schema.add({ deletedAt: { type: Date, default: null } });

  schema.query.notDeleted = function () {
    return this.where({ deletedAt: null });
  };

  schema.methods.softDelete = function () {
    this.deletedAt = new Date();
    return this.save();
  };

  schema.set('timestamps', true);
}

module.exports = { softDeletable };
