const { z } = require('zod');

const createDomain = z.object({
  domainName: z.string().min(1).toLowerCase(),
  registrar: z.string().optional(),
});

module.exports = { createDomain };
