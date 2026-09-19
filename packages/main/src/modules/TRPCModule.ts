import { BrowserWindow } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import type { AppModule } from '../AppModule';
import type { ModuleContext } from '../ModuleContext';
import { appRouter } from '../router/index';

class TRPCModule implements AppModule {
  enable({ app }: ModuleContext): void {
    const handler = createIPCHandler({ router: appRouter });

    // Automatically attach any new browser windows created in the app lifecycle
    app.on('browser-window-created', (_event, window) => {
      handler.attachWindow(window);
    });

    // Attach any windows that might already exist
    BrowserWindow.getAllWindows().forEach((win) => {
      handler.attachWindow(win);
    });
  }
}

export function createTRPCModule(): AppModule {
  return new TRPCModule();
}
