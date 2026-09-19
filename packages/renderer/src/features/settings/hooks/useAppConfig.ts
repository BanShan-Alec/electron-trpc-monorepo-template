import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../../../trpc';
import type { AppConfig } from '../types';

export function useAppConfig() {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const cfg = await trpc.getAppConfig.query();
      setAppConfig(cfg);
    } catch (err) {
      console.error('Failed to get app config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateConfig = async (partial: Partial<AppConfig>) => {
    try {
      const updated = await trpc.updateAppConfig.mutate(partial);
      setAppConfig(updated);
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const handleResetConfig = async () => {
    try {
      const res = await trpc.resetAppConfig.mutate();
      setAppConfig(res);
    } catch (err) {
      console.error('Failed to reset config:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    appConfig,
    isLoading,
    fetchConfig,
    handleUpdateConfig,
    handleResetConfig,
  };
}
