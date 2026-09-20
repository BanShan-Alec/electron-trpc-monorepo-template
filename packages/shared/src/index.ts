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

// ==========================================
// 自动更新相关 Schema 与契约
// ==========================================
export const updateStatusSchema = z.enum([
  'idle',
  'checking',
  'available',
  'not-available',
  'downloading',
  'downloaded',
  'error',
]);

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

export const updateProgressSchema = z.object({
  percent: z.number(),
  bytesPerSecond: z.number(),
  transferred: z.number(),
  total: z.number(),
});

export type UpdateProgress = z.infer<typeof updateProgressSchema>;

export const updateInfoSchema = z.object({
  version: z.string(),
  releaseDate: z.string().optional(),
  releaseNotes: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional(),
  releaseName: z.string().optional(),
});

export type UpdateInfo = z.infer<typeof updateInfoSchema>;

export const updateStateSchema = z.object({
  status: updateStatusSchema,
  currentVersion: z.string(),
  hasUpdate: z.boolean(),
  updateInfo: updateInfoSchema.nullable().optional(),
  progress: updateProgressSchema.nullable().optional(),
  error: z.string().nullable().optional(),
  showModalRequested: z.boolean(),
});

export type UpdateState = z.infer<typeof updateStateSchema>;
