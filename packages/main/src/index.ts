import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { app, dialog } from 'electron';
import type { AppInitConfig } from './AppInitConfig';
import { createModuleRunner } from './ModuleRunner';
import { terminateAppOnLastWindowClose } from './modules/ApplicationTerminatorOnLastWindowClose';
import { autoUpdater } from './modules/AutoUpdater';
import { allowInternalOrigins } from './modules/BlockNotAllowedOrigins';
import { getAppConfigStore } from './modules/ConfigStore';
import { allowExternalUrls } from './modules/ExternalUrls';
import { hardwareAccelerationMode } from './modules/HardwareAccelerationModule';
import { createLogModule, getLogManager } from './modules/LogManager';
import { disallowMultipleAppInstance } from './modules/SingleInstanceApp';
import { createTRPCModule } from './modules/TRPCModule';
import { createTrayModule } from './modules/TrayManager';
import { createWindowManagerModule } from './modules/WindowManager';
import { WindowStateKeeper } from './modules/WindowStateKeeper';
import { type AppRouter, appRouter } from './router/index';

export { type AppRouter, appRouter, getAppConfigStore, getLogManager, WindowStateKeeper };

const cjsRequire = typeof require === 'function' ? require : createRequire(import.meta.url);

function handleFatalCrash(type: string, error: unknown): void {
  const errorDetails = error instanceof Error ? error.stack || error.message : String(error);
  const logContent = `\n[FATAL CRASH] [${new Date().toISOString()}] [${type}]\n${errorDetails}\n`;

  console.error(logContent);

  try {
    const logDir = path.join(app?.getPath?.('userData') || process.cwd(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'fatal-crash.log'), logContent, 'utf8');
  } catch {
    try {
      fs.appendFileSync(path.join(process.cwd(), 'fatal-crash.log'), logContent, 'utf8');
    } catch {}
  }

  dialog.showErrorBox(
    'Application Initialization Error',
    `A critical error occurred while starting the application:\n\n${errorDetails}\n\nPlease check fatal-crash.log for details.`,
  );

  process.exit(1);
}

process.on('uncaughtException', (err) => handleFatalCrash('uncaughtException', err));
process.on('unhandledRejection', (reason) => handleFatalCrash('unhandledRejection', reason));

export async function initApp(initConfig: AppInitConfig) {
  const isDev = process.env.NODE_ENV !== 'production';
  const moduleRunner = createModuleRunner()
    .init(createLogModule())
    .init(createTRPCModule())
    .init(createWindowManagerModule({ initConfig, openDevTools: isDev }))
    .init(createTrayModule())
    .init(disallowMultipleAppInstance())
    .init(terminateAppOnLastWindowClose())
    .init(hardwareAccelerationMode({ enable: false }))
    .init(autoUpdater())

    // Security
    .init(
      allowInternalOrigins(
        new Set(initConfig.renderer instanceof URL ? [initConfig.renderer.origin] : []),
      ),
    )
    .init(
      allowExternalUrls(new Set(['https://github.com', 'https://vite.dev', 'https://react.dev'])),
    );

  await moduleRunner;
}

initApp({
  renderer:
    process.env.MODE === 'development' && process.env.VITE_DEV_SERVER_URL
      ? new URL(process.env.VITE_DEV_SERVER_URL as string)
      : {
          path: cjsRequire.resolve('@app/renderer'),
        },

  preload: {
    path: cjsRequire.resolve('@app/preload/exposed.js'),
  },
}).catch((error) => {
  handleFatalCrash('initAppFailed', error);
});
