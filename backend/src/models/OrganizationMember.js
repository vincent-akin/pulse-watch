const mongoose = require('mongoose');
const { softDeletable } = require('./plugins');
const { ROLES } = require('../common/constants');
const { Schema } = mongoose;

const organizationMemberSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ROLES, default: 'viewer' },
  status: { type: String, enum: ['invited', 'active', 'suspended'], default: 'invited' },
  invitedEmail: { type: String, default: null }, // set for pending invitations w/o a user yet
});

organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });

softDeletable(organizationMemberSchema);

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);
