const { z } = require('zod');
const { ENVIRONMENTS } = require('../../common/constants');

const authSchema = z.object({
  type: z.enum(['none', 'basic', 'bearer', 'apiKey']).default('none'),
  credentials: z.record(z.any()).default({}),
}).optional();

const retryPolicySchema = z.object({
  attempts: z.number().int().min(0).max(10).default(3),
  delay: z.number().int().min(0).default(5000),
}).optional();

const validationRuleSchema = z.object({
  path: z.string(),
  operator: z.enum(['equals', 'notEquals', 'contains', 'exists', 'greaterThan', 'lessThan']),
  expected: z.any().optional(),
});

const create = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().refine((u) => u.startsWith('https://'), 'Monitor URL must use HTTPS.'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).default('GET'),
  headers: z.record(z.string()).default({}),
  body: z.any().optional(),
  queryParameters: z.record(z.string()).default({}),
  authentication: authSchema,
  interval: z.number().int().min(10).default(60),
  timeout: z.number().int().min(1000).max(60000).default(5000),
  expectedStatusCode: z.number().int().default(200),
  enabled: z.boolean().default(true),
  region: z.array(z.string()).min(1).default(['us-east-1']),
  validationRules: z.array(validationRuleSchema).default([]),
  retryPolicy: retryPolicySchema,
  tags: z.array(z.string()).default([]),
  environment: z.enum(ENVIRONMENTS).default('production'),
});

const update = create.partial();

module.exports = { create, update };
