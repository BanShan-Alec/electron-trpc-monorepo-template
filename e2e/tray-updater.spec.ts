import { expect, test } from '@playwright/test';
import { type ElectronTestContext, launchElectronApp } from './helpers/electron';

test.describe('Electron 托盘与更新弹窗 E2E 自动化测试', () => {
  let ctx: ElectronTestContext;

  test.beforeAll(async () => {
    // 调用封装好的统一启动辅助函数
    ctx = await launchElectronApp();
  });

  test.afterAll(async () => {
    // 统一优雅清理资源
    await ctx?.cleanup();
  });

  test('初始加载时更新弹窗应当处于隐藏状态', async () => {
    const modalHeading = ctx.page.getByRole('heading', { name: '软件版本与更新' });
    await expect(modalHeading).not.toBeVisible();
  });

  test('从系统托盘右键菜单中触发“检查更新”后，前端应成功弹出检查更新窗口', async () => {
    const { page, electronApp } = ctx;
    const modalHeading = page.getByRole('heading', { name: '软件版本与更新' });

    // 1. 在 Electron 主进程中通过动态模块加载获取 TrayManager，通过稳定语义 ID 查找菜单项并触发点击
    const triggered = await electronApp.evaluate(async () => {
      // 利用 Node 原生模块机制动态加载主进程打包产物（零侵入业务源码）
      const { createRequire } = process.getBuiltinModule('node:module');
      const nodePath = process.getBuiltinModule('node:path');
      const mainIndexPath = nodePath.resolve(process.cwd(), 'packages/main/dist/index.cjs');
      const req = createRequire(mainIndexPath);
      const { getTrayManager } = req(mainIndexPath);

      const trayManager = getTrayManager?.();
      if (!trayManager) {
        throw new Error('无法在主进程中获取 TrayManager 单例实例');
      }

      const contextMenu = trayManager.getContextMenu();
      if (!contextMenu) {
        throw new Error('Tray 托盘上下文菜单尚未初始化');
      }

      // 通过稳定语义 ID 查找菜单项，避免硬编码文字匹配与国际化冲突
      const checkUpdateItem = contextMenu.getMenuItemById('tray-check-for-updates');

      if (!checkUpdateItem) {
        throw new Error('未在托盘菜单项中找到 ID 为 [tray-check-for-updates] 的菜单项');
      }

      // 执行托盘菜单点击绑定逻辑
      checkUpdateItem.click();
      return true;
    });

    expect(triggered).toBe(true);

    // 2. 验证前端界面响应 CustomEvent 成功展示弹窗
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    // 3. 验证弹窗内包含版本信息和关闭按钮
    await expect(page.getByText('当前运行版本')).toBeVisible();

    // 4. 点击弹窗关闭按钮，验证能正常关闭
    const closeBtn = page.getByRole('button', { name: '✕' });
    await closeBtn.click();
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
  });
});
