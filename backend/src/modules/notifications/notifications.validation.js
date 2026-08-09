const { z } = require('zod');

const emailConfig = z.object({ to: z.array(z.string().email()).min(1) });
const slackConfig = z.object({ webhookUrl: z.string().url() });
const discordConfig = z.object({ webhookUrl: z.string().url() });
const webhookConfig = z.object({ url: z.string().url(), headers: z.record(z.string()).optional() });

const createChannel = z.object({
  name: z.string().min(1),
  type: z.enum(['email', 'slack', 'discord', 'webhook']),
  configuration: z.union([emailConfig, slackConfig, discordConfig, webhookConfig]),
  enabled: z.boolean().default(true),
}).superRefine((data, ctx) => {
  const validators = { email: emailConfig, slack: slackConfig, discord: discordConfig, webhook: webhookConfig };
  const result = validators[data.type].safeParse(data.configuration);
  if (!result.success) {
    ctx.addIssue({ code: 'custom', path: ['configuration'], message: `Invalid configuration for channel type '${data.type}'.` });
  }
});

const updateChannel = z.object({
  name: z.string().min(1).optional(),
  configuration: z.record(z.any()).optional(),
  enabled: z.boolean().optional(),
});

module.exports = { createChannel, updateChannel };
