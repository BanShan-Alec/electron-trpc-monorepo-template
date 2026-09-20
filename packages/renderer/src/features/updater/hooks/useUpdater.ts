import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../../../trpc';
import type { UpdateState } from '../types';

const INITIAL_STATE: UpdateState = {
  status: 'idle',
  currentVersion: '1.0.3',
  hasUpdate: false,
  updateInfo: null,
  progress: null,
  error: null,
  showModalRequested: false,
};

export function useUpdater() {
  const [updateState, setUpdateState] = useState<UpdateState>(INITIAL_STATE);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.3');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // 1. 初始化读取应用实际版本号
  useEffect(() => {
    async function loadVersion() {
      try {
        const res = await trpc.getAppVersion.query();
        if (res?.version) {
          setCurrentVersion(res.version);
        }
      } catch (err) {
        console.warn('Failed to get app version:', err);
      }
    }
    loadVersion();
  }, []);

  // 2. 定时与状态轮询（感知托盘唤起、下载进度流转）
  const syncUpdateState = useCallback(async () => {
    try {
      const state = await trpc.getUpdateState.query();
      setUpdateState(state);

      if (state.currentVersion && state.currentVersion !== '0.0.0') {
        setCurrentVersion(state.currentVersion);
      }

      // 如果主进程托盘请求了打开弹窗
      if (state.showModalRequested) {
        setIsModalOpen(true);
        await trpc.ackUpdateModal.mutate();
      }
    } catch (err) {
      console.warn('Failed to sync update state:', err);
    }
  }, []);

  useEffect(() => {
    // 首次同步一次
    syncUpdateState();

    // 每 2.5 秒轮询一次状态
    const interval = setInterval(() => {
      syncUpdateState();
    }, 2500);

    return () => clearInterval(interval);
  }, [syncUpdateState]);

  // 3. 监听主进程托盘触发的 0 延迟原生 Web 事件
  useEffect(() => {
    const handleOpenModal = () => {
      setIsModalOpen(true);
      syncUpdateState();
    };

    window.addEventListener('app:open-update-modal', handleOpenModal);
    return () => {
      window.removeEventListener('app:open-update-modal', handleOpenModal);
    };
  }, [syncUpdateState]);

  // 3. 手动触发检查更新
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setIsModalOpen(true);
    try {
      const state = await trpc.checkForUpdates.mutate();
      setUpdateState(state);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateState((prev) => ({
        ...prev,
        status: 'error',
        error: msg || '检查更新失败',
      }));
    } finally {
      setIsChecking(false);
    }
  }, []);

  // 4. 手动触发开始下载
  const downloadUpdate = useCallback(async () => {
    try {
      setUpdateState((prev) => ({ ...prev, status: 'downloading' }));
      await trpc.downloadUpdate.mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateState((prev) => ({
        ...prev,
        status: 'error',
        error: msg || '下载更新包失败',
      }));
    }
  }, []);

  // 5. 立即重启并安装
  const installUpdateAndRestart = useCallback(async () => {
    try {
      await trpc.installUpdateAndRestart.mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateState((prev) => ({
        ...prev,
        status: 'error',
        error: msg || '退出安装失败',
      }));
    }
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    currentVersion,
    updateState,
    isModalOpen,
    isChecking,
    openModal,
    closeModal,
    checkForUpdates,
    downloadUpdate,
    installUpdateAndRestart,
  };
}

export type UseUpdaterReturn = ReturnType<typeof useUpdater>;
