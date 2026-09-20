import os from 'node:os';
import process from 'node:process';
import { initTRPC, TRPCError } from '@trpc/server';
import { app, BrowserWindow, dialog, shell } from 'electron';
import { z } from 'zod';
import { getAutoUpdaterManager } from '../modules/AutoUpdater';
import { getAppConfigStore } from '../modules/ConfigStore';
import { getLogManager } from '../modules/LogManager';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

import { configSchema } from '@app/shared';

export const appRouter = router({
  // 1. Ping / Health check
  ping: publicProcedure.query(() => {
    return {
      message: 'pong',
      timestamp: Date.now(),
      serverTime: new Date().toLocaleTimeString(),
    };
  }),

  // 2. Query system and runtime information
  getSystemInfo: publicProcedure.query(() => {
    const cpus = os.cpus();
    const memUsage = process.memoryUsage();

    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      v8Version: process.versions.v8,
      cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown',
      cpuCores: cpus.length,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      heapUsedMB: Math.round(memUsage.heapUsed / (1024 * 1024)),
      heapTotalMB: Math.round(memUsage.heapTotal / (1024 * 1024)),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }),

  // 3. Counter query & mutations with validation and persistent state
  getCounter: publicProcedure.query(() => {
    const store = getAppConfigStore();
    return { count: store.get('serverCounter') };
  }),

  incrementCounter: publicProcedure
    .input(
      z.object({
        step: z.number().int().min(1).max(100).default(1),
      }),
    )
    .mutation(({ input }) => {
      const store = getAppConfigStore();
      const newCount = store.get('serverCounter') + input.step;
      store.set({ serverCounter: newCount });
      return { count: newCount, step: input.step };
    }),

  decrementCounter: publicProcedure
    .input(
      z.object({
        step: z.number().int().min(1).max(100).default(1),
      }),
    )
    .mutation(({ input }) => {
      const store = getAppConfigStore();
      const newCount = store.get('serverCounter') - input.step;
      store.set({ serverCounter: newCount });
      return { count: newCount, step: input.step };
    }),

  resetCounter: publicProcedure.mutation(() => {
    const store = getAppConfigStore();
    store.set({ serverCounter: 0 });
    return { count: 0 };
  }),

  // 4. Safe calculation procedure with error handling
  calculate: publicProcedure
    .input(
      z.object({
        a: z.number(),
        b: z.number(),
        op: z.enum(['add', 'subtract', 'multiply', 'divide']),
      }),
    )
    .query(({ input }) => {
      const { a, b, op } = input;
      if (op === 'divide' && b === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot divide by zero!',
        });
      }

      let result = 0;
      switch (op) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          result = a / b;
          break;
      }

      return { a, b, op, result };
    }),

  // 5. System action mutation (DevTools & External links)
  performAction: publicProcedure
    .input(
      z.object({
        action: z.enum(['toggleDevTools', 'openUrl']),
        url: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

      if (input.action === 'toggleDevTools') {
        if (!window) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active window found to toggle DevTools',
          });
        }
        if (window.webContents.isDevToolsOpened()) {
          window.webContents.closeDevTools();
          return { success: true, message: 'DevTools closed' };
        } else {
          window.webContents.openDevTools();
          return { success: true, message: 'DevTools opened' };
        }
      }

      if (input.action === 'openUrl' && input.url) {
        const parsed = new URL(input.url);
        if (!['https:', 'http:'].includes(parsed.protocol)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid URL protocol. Only http: and https: are allowed.',
          });
        }
        await shell.openExternal(input.url);
        return { success: true, message: `Opened ${input.url}` };
      }

      return { success: false, message: 'No action performed' };
    }),

  // 6. Config & Preference Store procedures
  getAppConfig: publicProcedure.query(() => {
    return getAppConfigStore().getAll();
  }),

  updateAppConfig: publicProcedure.input(configSchema.partial()).mutation(({ input }) => {
    const updated = getAppConfigStore().set(input);
    getLogManager().mainLogger.info('[Config] App config updated:', input);
    return updated;
  }),

  resetAppConfig: publicProcedure.mutation(() => {
    const reset = getAppConfigStore().reset();
    getLogManager().mainLogger.info('[Config] App config reset to defaults');
    return reset;
  }),

  // 7. Logging & Diagnostics procedures
  logMessage: publicProcedure
    .input(
      z.object({
        level: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
        message: z.string(),
        meta: z.unknown().optional(),
      }),
    )
    .mutation(({ input }) => {
      getLogManager().logRendererMessage(input.level, input.message, input.meta);
      return { success: true };
    }),

  openLogFolder: publicProcedure.mutation(async () => {
    await getLogManager().openLogFolder();
    return { success: true, path: getLogManager().getLogDirectory() };
  }),

  // 8. Native Dialogs & Shell procedures
  openFileDialog: publicProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          filters: z
            .array(
              z.object({
                name: z.string(),
                extensions: z.array(z.string()),
              }),
            )
            .optional(),
          multiSelections: z.boolean().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const properties: ('openFile' | 'multiSelections')[] = ['openFile'];
      if (input?.multiSelections) {
        properties.push('multiSelections');
      }

      const result = await dialog.showOpenDialog(window, {
        title: input?.title,
        filters: input?.filters,
        properties,
      });

      return {
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    }),

  openDirectoryDialog: publicProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const result = await dialog.showOpenDialog(window, {
        title: input?.title,
        properties: ['openDirectory'],
      });

      return {
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    }),

  saveFileDialog: publicProcedure
    .input(
      z
        .object({
          title: z.string().optional(),
          defaultPath: z.string().optional(),
          filters: z
            .array(
              z.object({
                name: z.string(),
                extensions: z.array(z.string()),
              }),
            )
            .optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const result = await dialog.showSaveDialog(window, {
        title: input?.title,
        defaultPath: input?.defaultPath,
        filters: input?.filters,
      });

      return {
        canceled: result.canceled,
        filePath: result.filePath,
      };
    }),

  showItemInFolder: publicProcedure
    .input(
      z.object({
        path: z.string(),
      }),
    )
    .mutation(({ input }) => {
      shell.showItemInFolder(input.path);
      return { success: true };
    }),

  // 9. AutoUpdater procedures
  getAppVersion: publicProcedure.query(() => {
    return {
      version: app.getVersion(),
      name: app.getName(),
    };
  }),

  getUpdateState: publicProcedure.query(() => {
    return getAutoUpdaterManager().getState();
  }),

  checkForUpdates: publicProcedure.mutation(async () => {
    const state = await getAutoUpdaterManager().checkForUpdates(true);
    return state;
  }),

  downloadUpdate: publicProcedure.mutation(async () => {
    await getAutoUpdaterManager().downloadUpdate();
    return { success: true };
  }),

  installUpdateAndRestart: publicProcedure.mutation(() => {
    getAutoUpdaterManager().quitAndInstall();
    return { success: true };
  }),

  ackUpdateModal: publicProcedure.mutation(() => {
    getAutoUpdaterManager().ackShowModal();
    return { success: true };
  }),
});

export type AppRouter = typeof appRouter;
