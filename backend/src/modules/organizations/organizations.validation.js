const { z } = require('zod');

const create = z.object({
  name: z.string().min(1),
  timezone: z.string().default('UTC').optional(),
});

const update = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().optional(),
});

const invite = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'engineer', 'viewer']).default('viewer'),
});

const updateMember = z.object({
  role: z.enum(['admin', 'engineer', 'viewer']),
});

module.exports = { create, update, invite, updateMember };
