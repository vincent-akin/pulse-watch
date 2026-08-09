const { z } = require('zod');

const create = z.object({
  name: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

module.exports = { create };
