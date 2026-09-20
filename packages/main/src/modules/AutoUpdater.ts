import type { UpdateState } from '@app/shared';
import { app } from 'electron';
import electronUpdater, { type AppUpdater, type Logger } from 'electron-updater';
import type { AppModule } from '../AppModule';
import type { ModuleContext } from '../ModuleContext';
import { getAppConfigStore } from './ConfigStore';
import { getLogManager } from './LogManager';

export class AutoUpdaterManager implements AppModule {
  private static instance: AutoUpdaterManager | null = null;
  readonly #logger: Logger | null;

  private state: UpdateState = {
    status: 'idle',
    currentVersion: app ? app.getVersion() : '1.0.3',
    hasUpdate: false,
    updateInfo: null,
    progress: null,
    error: null,
    showModalRequested: false,
  };

  constructor({
    logger = null,
  }: {
    logger?: Logger | null | undefined;
  } = {}) {
    this.#logger = logger;
    AutoUpdaterManager.instance = this;
  }

  public static getInstance(): AutoUpdaterManager {
    if (!AutoUpdaterManager.instance) {
      AutoUpdaterManager.instance = new AutoUpdaterManager();
    }
    return AutoUpdaterManager.instance;
  }

  getAutoUpdater(): AppUpdater {
    const { autoUpdater } = electronUpdater;
    return autoUpdater;
  }

  public enable({ app: electronApp }: ModuleContext): void {
    const updater = this.getAutoUpdater();
    const logger = this.#logger || getLogManager().mainLogger;
    updater.logger = logger;
    updater.autoDownload = false; // 由用户确认后点击下载，或受控下载
    updater.autoInstallOnAppQuit = true;
    updater.fullChangelog = true;

    this.state.currentVersion = electronApp.getVersion();

    // 绑定 electron-updater 事件
    updater.on('checking-for-update', () => {
      logger.info('[AutoUpdater] Checking for updates...');
      this.state.status = 'checking';
      this.state.error = null;
    });

    updater.on('update-available', (info) => {
      logger.info(`[AutoUpdater] Update available: ${info.version}`);
      this.state.status = 'available';
      this.state.hasUpdate = true;
      this.state.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: (info.releaseNotes as string | undefined) ?? undefined,
        releaseName: info.releaseName ?? undefined,
      };
      this.state.error = null;
    });

    updater.on('update-not-available', (info) => {
      logger.info(
        `[AutoUpdater] Update not available. Current version is up-to-date (${info.version}).`,
      );
      this.state.status = 'not-available';
      this.state.hasUpdate = false;
      this.state.updateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
      };
      this.state.error = null;
    });

    updater.on('download-progress', (progressObj) => {
      logger.info(`[AutoUpdater] Download progress: ${progressObj.percent.toFixed(1)}%`);
      this.state.status = 'downloading';
      this.state.progress = {
        percent: Math.round(progressObj.percent * 10) / 10,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      };
    });

    updater.on('update-downloaded', (info) => {
      logger.info(`[AutoUpdater] Update downloaded successfully: ${info.version}`);
      this.state.status = 'downloaded';
      this.state.progress = {
        percent: 100,
        bytesPerSecond: 0,
        transferred: this.state.progress?.total || 0,
        total: this.state.progress?.total || 0,
      };
    });

    updater.on('error', (err) => {
      logger.warn('[AutoUpdater] Update check or download error:', err.message);
      this.state.status = 'error';
      this.state.error = err.message || '检查更新失败';
    });

    // 启动自检逻辑
    electronApp.whenReady().then(() => {
      const config = getAppConfigStore().getAll();
      if (config.autoCheckUpdate) {
        // 延迟 3 秒，让主渲染窗口先稳定呈现
        setTimeout(() => {
          this.checkForUpdates(false).catch((err) => {
            logger.warn('[AutoUpdater] Initial background update check failed:', err);
          });
        }, 3000);
      }
    });
  }

  public getState(): UpdateState {
    if (app && (!this.state.currentVersion || this.state.currentVersion === '0.0.0')) {
      this.state.currentVersion = app.getVersion();
    }
    return { ...this.state };
  }

  public requestShowModal(): void {
    this.state.showModalRequested = true;
  }

  public ackShowModal(): void {
    this.state.showModalRequested = false;
  }

  public async checkForUpdates(isManual = false): Promise<UpdateState> {
    const updater = this.getAutoUpdater();
    const logger = this.#logger || getLogManager().mainLogger;

    // 开发环境下如果没有配置更新，给予安全提示
    if (!app.isPackaged && !process.env.FORCE_UPDATE_CHECK) {
      logger.info('[AutoUpdater] Running in unpackaged/dev mode.');
      if (isManual) {
        // 在开发环境点击手动检查时，尝试执行一次，捕获可能的缺少 dev-app-update.yml 错误
        try {
          this.state.status = 'checking';
          this.state.error = null;
          await updater.checkForUpdates();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(
            '[AutoUpdater] Dev check error (expected if dev-app-update.yml missing):',
            msg,
          );
          this.state.status = 'not-available';
          this.state.error = `开发环境测试模式：${msg}`;
        }
        return this.getState();
      }
      return this.getState();
    }

    try {
      this.state.status = 'checking';
      this.state.error = null;
      await updater.checkForUpdates();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('[AutoUpdater] Failed to check for updates:', msg);
      this.state.status = 'error';
      this.state.error = msg;
    }

    return this.getState();
  }

  public async downloadUpdate(): Promise<void> {
    const updater = this.getAutoUpdater();
    this.state.status = 'downloading';
    this.state.error = null;
    await updater.downloadUpdate();
  }

  public quitAndInstall(): void {
    const updater = this.getAutoUpdater();
    updater.quitAndInstall(false, true);
  }
}

export function autoUpdater(...args: ConstructorParameters<typeof AutoUpdaterManager>) {
  return new AutoUpdaterManager(...args);
}

export function getAutoUpdaterManager(): AutoUpdaterManager {
  return AutoUpdaterManager.getInstance();
}
