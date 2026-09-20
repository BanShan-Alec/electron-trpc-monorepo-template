import { expect, test } from './helpers/fixture';

test.describe('应用启动与主窗口渲染 E2E 测试', () => {
  test('应用启动后渲染窗口应当成功展示，包含应用标题和主导航', async ({ page }) => {
    // 1. 验证应用主标题正常渲染
    const mainTitle = page.getByRole('heading', { name: 'Electron + Vite + tRPC' });
    await expect(mainTitle).toBeVisible();

    // 2. 验证脚手架副标题文本
    await expect(page.getByText('企业级端到端类型安全桌面客户端脚手架')).toBeVisible();

    // 3. 验证默认展示的功能控制台导航处于选中状态
    const consoleTab = page.getByRole('button', { name: /功能控制台/ });
    await expect(consoleTab).toBeVisible();
  });
});
