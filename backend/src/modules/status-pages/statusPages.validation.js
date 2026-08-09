const { z } = require('zod');

const create = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens.').optional(),
  monitorIds: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

const update = z.object({
  title: z.string().min(1).optional(),
  monitorIds: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

module.exports = { create, update };
