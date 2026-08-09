const { z } = require('zod');

const checkout = z.object({ planKey: z.string().min(1) });

module.exports = { checkout };
