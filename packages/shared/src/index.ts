import { z } from 'zod';

export const configSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  minimizeToTray: z.boolean().default(true),
  language: z.string().default('zh-CN'),
  autoCheckUpdate: z.boolean().default(true),
  serverCounter: z.number().int().default(0),
});

export type AppConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'system',
  minimizeToTray: true,
  language: 'zh-CN',
  autoCheckUpdate: true,
  serverCounter: 0,
};

export const calculateSchema = z.object({
  a: z.number(),
  b: z.number(),
  op: z.enum(['add', 'subtract', 'multiply', 'divide']),
});

export type CalculateInput = z.infer<typeof calculateSchema>;

export const logSchema = z.object({
  level: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
  message: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type LogInput = z.infer<typeof logSchema>;
