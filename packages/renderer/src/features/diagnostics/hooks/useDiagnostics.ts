import { useState } from 'react';
import { trpc } from '../../../trpc';

export function useDiagnostics() {
  const [logStatus, setLogStatus] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLog = async (level: 'info' | 'warn' | 'error') => {
    setIsLoading(true);
    try {
      await trpc.logMessage.mutate({
        level,
        message: `测试 ${level.toUpperCase()} 日志沉淀来自 Renderer`,
        meta: { timestamp: Date.now() },
      });
      setLogStatus(`✅ 已发送 ${level.toUpperCase()} 日志到 renderer.log`);
    } catch (err) {
      setLogStatus(`❌ 发送日志失败: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLogFolder = async () => {
    setIsLoading(true);
    try {
      const res = await trpc.openLogFolder.mutate();
      setLogStatus(`📂 已打开日志目录: ${res.path}`);
    } catch (err) {
      setLogStatus(`打开目录失败: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDevTools = async () => {
    try {
      const res = await trpc.performAction.mutate({ action: 'toggleDevTools' });
      setActionMessage(res.message);
    } catch (err: unknown) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleOpenDocs = async () => {
    try {
      const res = await trpc.performAction.mutate({
        action: 'openUrl',
        url: 'https://github.com/jsonnull/electron-trpc',
      });
      setActionMessage(res.message);
    } catch (err: unknown) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return {
    logStatus,
    actionMessage,
    isLoading,
    handleSendLog,
    handleOpenLogFolder,
    handleToggleDevTools,
    handleOpenDocs,
  };
}
