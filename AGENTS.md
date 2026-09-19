# AI Agent Guidelines & Project Instructions

> 本文件遵循业界开放规范 [AGENTS.md](https://agents.md)，专为 **AI 编程助手（Cursor / Windsurf / Claude Code / GitHub Copilot / Antigravity 等）** 提供机器可读的代码库上下文、架构铁律与开发指引。

---

## 🤖 核心准则与不可违背铁律 (Ground Truths)

在对本项目进行任何代码修改、功能新增或重构时，**必须严格遵循以下四大铁律**：

### 1. 绝对的进程隔离与类型仅导入 (Type-Only Imports)
* **严禁跨界 Node API**：渲染进程（`packages/renderer`）运行在浏览器 Chromium 沙箱中，无 Node.js 环境。**严禁**在渲染进程直接引入 `fs`、`path`、`child_process`、`electron`（如 `ipcRenderer`）或任何 Node 原生模块。
* **仅类型导入主进程**：渲染进程消费主进程路由时，必须**显式使用** `import type { AppRouter } from '@app/main/router'`。严禁使用值导入（Value Import），避免将 Node.js 逻辑或主进程代码打包进前端造成构建或运行时崩溃。

### 2. 严禁散装 IPC，全量统一接入 tRPC
* **零字符串频道**：严禁手写 `ipcRenderer.send/invoke`、`ipcMain.on/handle` 或手写维护 `.d.ts` 白名单。
* **统一调用通路**：所有进程间通信（Query、Mutation）必须在 `packages/main/src/router/index.ts` 中声明 Procedure，由渲染进程通过 `trpc.xxx.query()/mutate()` 进行 100% 强类型调用。

### 3. Schema 优先与共享层规范
* **契约先行**：所有涉及跨进程传输的数据模型、校验规则（Zod Schema）与 TypeScript 接口，必须优先定义在 `packages/shared/src/index.ts` 中。
* **两端复用**：`@app/shared` 同时供 `@app/main`（入参校验）与 `@app/renderer`（表单/UI校验）直接引用，保持单一事实源（Single Source of Truth）。

### 4. 工程守卫与自动化规范
* **Biome 格式化**：本项目采用 [Biome](https://biomejs.dev/)，**严禁引入 ESLint 或 Prettier**。代码修改后统一运行 `pnpm run lint:fix`。
* **Git Commit 校验**：提交信息必须遵循 Conventional Commits 规范，且 **Subject 说明中必须包含简体中文**（如：`feat(router): 增加剪贴板监听过程`），否则会被 Commitlint 钩子硬拦截。
* **包管理器**：全局强制使用 `pnpm`（版本 `>= 10.0.0`），依赖版本由根目录 `pnpm-workspace.yaml` 中的 `catalog:` 集中管理，严禁使用 `npm` 或 `yarn`。

---

## 🗺️ 核心文件上下文索引 (Context Map)

定位或理解代码时，请优先检索以下关键文件：

| 职责分类 | 文件相对路径 | 核心职责说明 |
| :--- | :--- | :--- |
| **主进程入口** | [`packages/main/src/index.ts`](packages/main/src/index.ts) | Electron 启动初始化、全局崩溃拦截、ModuleRunner 插件装配 |
| **tRPC 路由总表** | [`packages/main/src/router/index.ts`](packages/main/src/router/index.ts) | 主进程所有 IPC Procedure（Query/Mutation）集中定义点 |
| **主进程配置持久化** | [`packages/main/src/modules/ConfigStore.ts`](packages/main/src/modules/ConfigStore.ts) | `app-config.json` 本地配置管理单例 |
| **主进程日志管理** | [`packages/main/src/modules/LogManager.ts`](packages/main/src/modules/LogManager.ts) | 本地轮转日志管理与渲染进程日志桥接 |
| **主进程窗口管理** | [`packages/main/src/modules/WindowManager.ts`](packages/main/src/modules/WindowManager.ts) | 窗口创建、DevTools 控制、状态恢复与生命周期 |
| **Preload 桥接** | [`packages/preload/src/exposed.ts`](packages/preload/src/exposed.ts) | 仅调用 `exposeElectronTRPC()`，遵循最小特权原则 |
| **前端 tRPC 客户端** | [`packages/renderer/src/trpc.ts`](packages/renderer/src/trpc.ts) | 初始化前端 `createTRPCProxyClient<AppRouter>` 单例 |
| **前端主入口** | [`packages/renderer/src/main.tsx`](packages/renderer/src/main.tsx) | React 19 应用挂载点与根组件渲染 |
| **共享 Schema/类型** | [`packages/shared/src/index.ts`](packages/shared/src/index.ts) | Zod Schema、公共 DTO 及 TypeScript 契约定义 |
| **开发启动脚本** | [`scripts/dev.ts`](scripts/dev.ts) | Vite Dev Server 与 Electron 联调及热重启编排 |
| **生产打包脚本** | [`scripts/build.ts`](scripts/build.ts) | 跨包编译与 electron-builder 打包编排 |
| **打包详细配置** | [`build/electron-builder.ts`](build/electron-builder.ts) | 平台专属打包产物、架构与输出规则 |
| **代码检查规范** | [`.config/biome.json`](.config/biome.json) | Biome 格式化、Linter 静态检查规则配置 |

---

## ⚡ 常用开发与校验指令 (Commands)

| 任务 | 命令 | 说明 |
| :--- | :--- | :--- |
| **启动热更新开发** | `pnpm start` / `pnpm run dev` | 启动 Vite 与 Electron，监听变更热重启 |
| **全量类型检查** | `pnpm run typecheck` | 执行全工作区 TypeScript 严格编译校验 |
| **代码规范扫描** | `pnpm run lint` | 执行 Biome 代码规范和静态语法扫描 |
| **自动格式化与修复** | `pnpm run lint:fix` | 自动修复代码格式与 Lint 问题 |
| **快速打包目录测试** | `pnpm run build:dir` | 输出免安装解压目录至 `dist/`，用于快速本地验证 |
| **构建完整安装包** | `pnpm run build:win` | 编译各包并生成 Windows 安装程序 |

---

## 🔌 新功能落地开发蓝图：标准 3 步法 (Feature Blueprint)

当需要新增业务功能（如快捷键配置、持久化选项读取）时，必须按此 3 步闭环进行开发：

### Step 1. 在共享层声明 Schema 与类型
编辑 [`packages/shared/src/index.ts`](packages/shared/src/index.ts)：
```ts
import { z } from 'zod';

// 1. 定义入参/出参的 Zod 校验规则
export const shortcutConfigSchema = z.object({
  action: z.string().min(1),
  keyCombo: z.string().regex(/^(CommandOrControl|Ctrl|Alt|Shift)\+[A-Z0-9]$/),
});

// 2. 导出 TypeScript 强类型
export type ShortcutConfig = z.infer<typeof shortcutConfigSchema>;
```

### Step 2. 在主进程 Router 中定义 Procedure
编辑 [`packages/main/src/router/index.ts`](packages/main/src/router/index.ts)：
```ts
import { shortcutConfigSchema } from '@app/shared';
import { TRPCError } from '@trpc/server';

export const appRouter = router({
  // 注册新的 Query 或 Mutation
  saveShortcut: publicProcedure
    .input(shortcutConfigSchema)
    .mutation(async ({ input }) => {
      if (input.action === 'reserved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '该快捷键动作为系统保留，无法覆写',
        });
      }

      // 执行主进程业务逻辑...
      return { success: true, saved: input };
    }),
});
```

### Step 3. 在渲染进程组件中强类型消费
在 [`packages/renderer/src`](packages/renderer/src) 下的 React 组件中调用：
```tsx
import { useState } from 'react';
import { trpc } from '@/trpc';

export function ShortcutSetting() {
  const [status, setStatus] = useState('');

  const handleSave = async () => {
    try {
      const res = await trpc.saveShortcut.mutate({
        action: 'openQuickSearch',
        keyCombo: 'CommandOrControl+K',
      });
      setStatus(`保存成功: ${res.saved.keyCombo}`);
    } catch (err: any) {
      setStatus(`保存失败: ${err.message}`);
    }
  };

  return (
    <div>
      <button onClick={handleSave}>绑定快捷键</button>
      <span>{status}</span>
    </div>
  );
}
```

---

## 🧱 主进程扩展指引：ModuleRunner 架构

主进程采用管道化插件接口 `AppModule`，解耦模块生命周期：
```ts
export interface AppModule {
  enable(context: ModuleContext): Promise<void> | void;
}
```

在 [`packages/main/src/index.ts`](packages/main/src/index.ts) 中按序链式注册：
- 需要增加全局系统能力（如 SQLite 数据库、系统快捷键监听、常驻托盘行为）时，应在 `packages/main/src/modules/` 下新建模块并实现 `AppModule` 接口，再通过 `.init(createXxxModule())` 挂载。

---

## ⚠️ AI 易错与避坑防错守则 (Anti-Patterns for AI)

| 常见错误反模式 (Anti-Pattern) | 危害与报错 | 正确做法 (Best Practice) |
| :--- | :--- | :--- |
| **在 Renderer 中 import Node API**<br>`import fs from 'node:fs'` | 构建失败，或报错 `Module "fs" has been externalized for browser compatibility` | 在主进程 Procedure 中处理文件，前端调用 `trpc.xxx` 获取 |
| **以值方式导入主进程路由**<br>`import { AppRouter } from '@app/main/router'` | Node 代码混入前端打包产物，导致打包严重污染甚至运行时崩溃 | **严格使用类型导入**：<br>`import type { AppRouter } from '@app/main/router'` |
| **绕过 tRPC 手写 IPC**<br>`ipcRenderer.invoke('my-event')` | 破坏端到端类型安全，失去 Zod 运行时校验保护 | 在 `packages/main/src/router/index.ts` 中注册 tRPC Procedure |
| **擅自引入 ESLint / Prettier**<br>新增 `.eslintrc.js` 或 `.prettierrc` | 与既有 Biome 工具链冲突，破坏代码检查 | 仅遵循并使用 Biome，运行 `pnpm run lint:fix` |
| **Git Commit 仅写英文 Subject**<br>`git commit -m "feat: add shortcut"` | commit-msg 钩子硬拦截，提交失败 | **Subject 必须包含简体中文**：<br>`git commit -m "feat(shortcut): 增加快捷键保存能力"` |
| **使用 npm / yarn 安装依赖**<br>执行 `npm install` | 破坏 `pnpm-workspace.yaml` 软链接与 Catalog 体系 | 统一使用 `pnpm add <pkg>`，共享基础库使用 `catalog:` |
