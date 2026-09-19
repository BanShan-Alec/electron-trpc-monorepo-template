# Electron tRPC Monorepo Template

> 基于 **Electron 41 + Vite + React 19 + tRPC + TailwindCSS + Biome** 构建的现代化、高性能、100% 端到端类型安全（End-to-End Type-Safe）桌面应用 Monorepo 模板。

---

## ✨ 核心特性

- 🛡️ **100% 端到端类型安全 IPC**：集成 `electron-trpc`，主进程 Router 与渲染进程 Client 共享类型契约，彻底告别拼写错误频出的字符串 IPC 频道与繁重手写的 `.d.ts` 声明。
- ⚡ **极致极速的开发体验**：基于 Vite 驱动的渲染进程即时热重载（HMR）与主进程/Preload 增量构建，毫秒级响应。
- 📦 **现代清晰的 Monorepo 架构**：基于 `pnpm workspace` 划分清晰边界（Main、Preload、Renderer、Shared），职责分明，解耦易维护。
- 🎨 **现代化 UI 栈**：采用 React 19 + TailwindCSS，内置仪表盘与原生交互能力演示。
- 🧹 **极速工程规范与质量守卫**：全链路采用 [Biome](https://biomejs.dev/) 进行毫秒级代码格式化与 Lint 校验，配合 Husky、lint-staged 与 Commitlint 保障每次提交质量。
- 🚀 **开箱即用的多平台构建**：集成 TypeScript 编写的 `scripts/build.ts` 与收拢的 `build/electron-builder.ts` 配置，便捷打包 Windows、macOS 与 Linux 原生安装包。

---

## 📂 项目结构

```text
electron-trpc-monorepo-template/
├── .config/                  # 工程工具链配置（Biome、Commitlint、changelogen）
├── build/                    # 打包配置与原生静态资源（图标、entitlements 等）
├── docs/                     # 架构文档与开发指南
│   └── ELECTRON_TRPC_GUIDE.md # 📖 Electron-tRPC 架构与深度指南
├── packages/
│   ├── main/                 # [主进程] 窗口生命周期、原生交互、tRPC Router 与 Handler
│   ├── preload/              # [Preload] 安全桥接、暴露 electronTRPC 上下文
│   ├── renderer/             # [渲染进程] React 19 + TailwindCSS 现代前端应用
│   ├── shared/               # [共享层] 跨进程通用工具、类型定义与 Zod Schema
│   └── tsconfig/             # 共享的 TypeScript 基础配置
├── scripts/                  # 工程构建与启动脚本（TS 编写）
│   ├── dev.ts                # 开发服务启动与热重启编排
│   └── build.ts              # 跨平台打包构建 CLI
├── pnpm-workspace.yaml       # pnpm monorepo 与依赖 Catalog 配置
├── package.json              # 根项目元数据与通用脚本
└── CONTRIBUTING.md           # 团队工程规范与 Git 提交指南
```

---

## 🚀 快速上手

### 环境要求
- **Node.js**: `>= 22.0.0`
- **pnpm**: `>= 10.0.0`

### 1. 安装依赖
```bash
pnpm install
```

> [!NOTE]
> 本项目根目录已预设 `.npmrc`，内置国内淘宝镜像加速源与 hoisted 软链策略。

### 2. 启动本地开发
```bash
pnpm start
# 或者
npm start
```
执行后将自动启动 Vite Dev Server，启动 Electron 窗口并挂载 tRPC 桥接。主进程代码发生变动将自动增量编译并重启应用；前端页面变动享受秒级 HMR。

---

## 🛠️ 构建与打包

本项目将打包逻辑收拢于 `scripts/build.ts` 与 `build/electron-builder.ts`：

```bash
# 仅编译各 Package 产物并打包为原生应用目录（快速调试）
pnpm run build:dir

# 打包 Windows 安装程序 (.exe / NSIS)
pnpm run build:win

# 打包 macOS 安装程序 (.dmg)
pnpm run build:mac

# 打包 Linux 安装包 (.deb)
pnpm run build:linux
```

打包生成的可执行文件与安装包将输出至根目录下的 `dist/` 文件夹中。

---

## 💡 tRPC 进程间通信实战

在本项目中，前端调用主进程方法就像调用普通的本地异步函数一样自然，完全享受 TypeScript 强类型补全与编译期校验：

### 1. 主进程定义路由过程 (Procedure)
```ts
// packages/main/src/router/index.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  getSystemInfo: t.procedure.query(async () => {
    return { platform: process.platform, arch: process.arch };
  }),
  saveConfig: t.procedure
    .input(z.object({ theme: z.enum(['light', 'dark']) }))
    .mutation(async ({ input }) => {
      // 写入持久化存储...
      return { success: true, theme: input.theme };
    }),
});

export type AppRouter = typeof appRouter;
```

### 2. 前端安全调用 (Renderer)
```tsx
// packages/renderer/src/App.tsx
import { trpc } from './utils/trpc';

export function Dashboard() {
  const handleGetInfo = async () => {
    // ✨ 拥有完整的 TypeScript 类型提示与参数校验
    const info = await trpc.getSystemInfo.query();
    console.log(info.platform, info.arch);
  };

  return <button onClick={handleGetInfo}>获取系统信息</button>;
}
```

> 深入学习 tRPC 与 Electron 的完整架构、订阅（Subscription）与最佳实践，请参阅：
> 📖 **[Electron-tRPC 架构解析与深度玩法指南](docs/ELECTRON_TRPC_GUIDE.md)**。

---

## 📋 代码规范与质量保障

- **代码风格与静态检查**：
  ```bash
  pnpm run lint       # 检查格式与规范
  pnpm run lint:fix   # 自动修复可修复的格式与 Lint 问题
  pnpm run typecheck  # 执行全项目 TypeScript 类型检查
  ```
- **提交规范**：遵循 Conventional Commits 规范，提交信息必须包含简体中文说明。详情参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📄 License

本项目采用 [MIT License](LICENSE) 开源协议。
