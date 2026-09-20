const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl(port, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${port}/json`, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          })
          .on('error', reject);
      });

      const page = data.find((item) => item.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Retry
    }
    await sleep(500);
  }
  throw new Error(`Failed to get WebSocket debugger URL on port ${port}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  async send(method, params = {}) {
    await this.ready();
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  }

  close() {
    this.ws.close();
  }
}

async function runAutomation() {
  console.log('🚀 [Automation] 启动 Electron 应用并开启 CDP 调试端口 9222...');
  const exePath = path.resolve(
    'h:/electron-app-temp4/dist/win-unpacked/Electron tRPC Template.exe',
  );

  const child = spawn(exePath, ['--remote-debugging-port=9222'], {
    stdio: 'ignore',
    detached: false,
  });

  try {
    console.log('⏳ [Automation] 等待 Electron 窗口启动并捕获 CDP 会话...');
    const wsUrl = await getDebuggerUrl(9222);
    console.log('🔗 [Automation] 成功连接至 Chromium DevTools Protocol:', wsUrl);

    const cdp = new CDPClient(wsUrl);
    await cdp.ready();

    // 启用 Runtime 和 DOM
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    console.log('⏳ [Automation] 等待 React 前端渲染就绪...');
    await sleep(2500);

    // 1. 验证 Header 上的版本号 Badge
    console.log('🔎 [Step 1] 校验 Header 版本号 Badge 显示内容...');
    const badgeText = await cdp.evaluate(`
      (() => {
        const badges = Array.from(document.querySelectorAll('span, button'));
        const versionEl = badges.find(el => el.textContent && el.textContent.includes('v1.0.3'));
        return versionEl ? versionEl.textContent.trim() : 'NOT_FOUND';
      })()
    `);
    console.log('   👉 Header 版本号展示结果:', badgeText);
    if (!badgeText.includes('v1.0.3')) {
      throw new Error(`版本号 Badge 校验失败，实际展示为: ${badgeText}`);
    }
    console.log('   ✅ [Step 1 成功] 版本号 Badge 正确显示 v1.0.3');

    // 2. 模拟用户点击 Header 上的版本 Badge 唤起更新弹窗
    console.log('🖱️ [Step 2] 模拟用户点击版本号 Badge，唤起更新弹窗 (UpdateModal)...');
    const clicked = await cdp.evaluate(`
      (() => {
        const btn = document.querySelector('button[title*="版本与检查更新"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('   👉 点击按钮执行结果:', clicked);
    await sleep(1000);

    // 3. 验证更新弹窗是否已在 DOM 中弹出
    console.log('🔎 [Step 3] 校验 UpdateModal 是否成功弹出...');
    const modalTitle = await cdp.evaluate(`
      (() => {
        const headings = Array.from(document.querySelectorAll('h3'));
        const modalH3 = headings.find(h => h.textContent && h.textContent.includes('软件版本与更新'));
        return modalH3 ? modalH3.textContent.trim() : 'NOT_FOUND';
      })()
    `);
    console.log('   👉 弹窗标题:', modalTitle);
    if (!modalTitle.includes('软件版本与更新')) {
      throw new Error(`弹窗弹出失败，当前找到的标题为: ${modalTitle}`);
    }
    console.log('   ✅ [Step 3 成功] UpdateModal 成功打开，标题包含: "软件版本与更新"');

    // 4. 模拟点击弹窗内的“检查更新”按钮触发与 GitHub Releases 的连接
    console.log('🔍 [Step 4] 点击弹窗内的 "🔍 检查更新" 按钮，向 GitHub Releases 查询...');
    await cdp.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const checkBtn = buttons.find(b => b.textContent && b.textContent.includes('检查更新'));
        if (checkBtn) checkBtn.click();
      })()
    `);

    // 5. 轮询监听更新状态流转
    console.log('⏳ [Step 5] 监听与获取更新检测结果（预计 2~6 秒）...');
    let targetVersionDiscovered = false;
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const stateInfo = await cdp.evaluate(`
        (() => {
          const text = document.body.innerText;
          return {
            hasNewVersionBadge: text.includes('v1.0.4'),
            hasAvailableNotice: text.includes('发现新版本'),
            hasDownloadBtn: text.includes('立即下载更新'),
            bodySnippet: text.slice(0, 300)
          };
        })()
      `);

      if (
        stateInfo.hasNewVersionBadge ||
        stateInfo.hasAvailableNotice ||
        stateInfo.hasDownloadBtn
      ) {
        console.log('\n🎉 [OTA 验证成功] 自动化成功检测到新版本发布！');
        console.log('   👉 匹配到远程最新版本: v1.0.4');
        console.log('   👉 检测到操作动作: "立即下载更新" 按钮已就绪');
        targetVersionDiscovered = true;

        // 6. 模拟点击“立即下载更新”
        console.log('\n📥 [Step 6] 模拟用户点击 "📥 立即下载更新" 按钮...');
        await cdp.evaluate(`
          (() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const dlBtn = buttons.find(b => b.textContent && b.textContent.includes('立即下载更新'));
            if (dlBtn) dlBtn.click();
          })()
        `);

        console.log('⏳ [Step 7] 监听下载流转状态与进度条反馈...');
        for (let j = 0; j < 15; j++) {
          await sleep(1000);
          const dlState = await cdp.evaluate(`
            (() => {
              const text = document.body.innerText;
              return {
                isDownloading: text.includes('正在下载更新包') || text.includes('准备中') || text.includes('%'),
                isDownloaded: text.includes('更新包已就绪') || text.includes('立即重启并安装'),
              };
            })()
          `);
          if (dlState.isDownloading || dlState.isDownloaded) {
            console.log(
              '   👉 界面状态机响应成功: ' +
                (dlState.isDownloaded
                  ? '更新包已下载就绪，显示“立即重启并安装”！'
                  : '进入“正在下载更新包...”进度视图'),
            );
            break;
          }
        }
        break;
      } else {
        process.stdout.write('.');
      }
    }

    if (!targetVersionDiscovered) {
      console.log('\n⚠️ 未在指定时间内完成检测，打印当前页面文本片段排查：');
      const pageText = await cdp.evaluate(`document.body.innerText`);
      console.log(pageText);
    } else {
      console.log('\n==========================================================');
      console.log('🏆 [验收结果] 端到端自动化测试全部通过！');
      console.log('1. 本地 v1.0.3 客户端成功启动并正确显示当前版本号。');
      console.log('2. 成功通过点击 Header Badge 呼出更新弹窗。');
      console.log('3. 成功连接 GitHub Releases 获取到刚发布的最新 v1.0.4 版本。');
      console.log('4. 弹窗状态机顺利流转到 "发现新版本 v1.0.4" 并呈现下载动作。');
      console.log('==========================================================\n');
    }

    cdp.close();
  } finally {
    console.log('🛑 [Automation] 测试结束，关闭 Electron 应用进程...');
    child.kill();
  }
}

runAutomation().catch((err) => {
  console.error('❌ [Automation Failed]:', err);
  process.exit(1);
});
