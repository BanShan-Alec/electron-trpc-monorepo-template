import type React from 'react';
import { Badge, Card } from '../../../components/ui';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Flow Diagram Card */}
      <Card
        title="electron-trpc 通信架构全流程"
        subtitle="消除繁琐的字符串 IPC 频道与 Preload 转发白名单"
        icon="💡"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          <div className="flex items-start gap-3 p-3.5 bg-background-secondary/50 rounded-xl border border-border">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              1
            </div>
            <div>
              <span className="font-semibold text-xs text-foreground block">
                Main 进程声明 Router
              </span>
              <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">
                使用{' '}
                <code className="text-primary font-mono text-[11px] bg-primary/10 px-1 py-0.5 rounded">
                  initTRPC.create().router(...)
                </code>{' '}
                编写 Procedure 业务接口，无需手动管理 IPC 事件监听。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-background-secondary/50 rounded-xl border border-border">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              2
            </div>
            <div>
              <span className="font-semibold text-xs text-foreground block">
                Preload 脚本注入安全通道
              </span>
              <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">
                在预加载脚本中调用{' '}
                <code className="text-primary font-mono text-[11px] bg-primary/10 px-1 py-0.5 rounded">
                  exposeElectronTRPC()
                </code>
                ，在强隔离沙箱下安全暴露受限通信管道。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-background-secondary/50 rounded-xl border border-border">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              3
            </div>
            <div>
              <span className="font-semibold text-xs text-foreground block">
                Main 进程绑定 Handler
              </span>
              <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">
                使用{' '}
                <code className="text-primary font-mono text-[11px] bg-primary/10 px-1 py-0.5 rounded">
                  createIPCHandler({`{ router }`})
                </code>{' '}
                监听窗口请求，自动实现参数校验与路由分发。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-background-secondary/50 rounded-xl border border-border">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              4
            </div>
            <div>
              <span className="font-semibold text-xs text-foreground block">Renderer 进程消费</span>
              <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">
                使用{' '}
                <code className="text-primary font-mono text-[11px] bg-primary/10 px-1 py-0.5 rounded">
                  createTRPCProxyClient&lt;AppRouter&gt;
                </code>
                ，获得犹如本地函数调用般的自动补全与类型推导。
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Code Comparison Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Legacy IPC */}
        <div className="glass-card rounded-xl p-4 border border-danger/30 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-danger/20">
            <span className="text-xs font-bold text-foreground">❌ 传统 Electron IPC 方式</span>
            <Badge variant="danger" size="sm">
              脆弱 & 维护成本高
            </Badge>
          </div>
          <pre className="text-[11px] font-mono text-foreground-secondary bg-background/80 p-3 rounded-lg overflow-x-auto leading-relaxed flex-1">
            {`// 1. 主进程手动监听字符串频道
ipcMain.handle('get-system-info', async () => {
  return { platform: process.platform, ... };
});

// 2. 预加载脚本手写白名单桥接
contextBridge.exposeInMainWorld('myApi', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info')
});

// 3. 渲染进程调用 (无补全，极易拼错)
const info = await window.myApi.getSystemInfo();
// 缺少参数/返回值强约束，重构极易出暗坑！`}
          </pre>
        </div>

        {/* Modern tRPC */}
        <div className="glass-card rounded-xl p-4 border border-success/30 flex flex-col">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-success/20">
            <span className="text-xs font-bold text-foreground">✨ electron-trpc 现代方式</span>
            <Badge variant="success" size="sm">
              端到端强类型 & 零多余代码
            </Badge>
          </div>
          <pre className="text-[11px] font-mono text-foreground-secondary bg-background/80 p-3 rounded-lg overflow-x-auto leading-relaxed flex-1">
            {`// 1. 主进程声明 Router (带 Zod 校验)
export const appRouter = router({
  getSystemInfo: publicProcedure.query(() => ({
    platform: process.platform, ...
  }))
});
export type AppRouter = typeof appRouter;

// 2. 渲染进程直接消费
import { trpc } from './trpc';
// 享受 100% IDE 智能补全与参数类型检查：
const info = await trpc.getSystemInfo.query();`}
          </pre>
        </div>
      </div>
    </div>
  );
};
