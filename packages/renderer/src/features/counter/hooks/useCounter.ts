import { useCallback, useEffect, useState } from 'react';
import { trpc } from '../../../trpc';

export function useCounter() {
  const [count, setCount] = useState<number>(0);
  const [step, setStep] = useState<number>(1);
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshCounter = useCallback(async () => {
    try {
      const res = await trpc.getCounter.query();
      setCount(res.count);
    } catch (err) {
      console.error('Failed to get counter:', err);
    }
  }, []);

  const handleIncrement = async () => {
    setIsUpdating(true);
    try {
      const res = await trpc.incrementCounter.mutate({ step });
      setCount(res.count);
    } catch (err) {
      console.error('Increment failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async () => {
    setIsUpdating(true);
    try {
      const res = await trpc.decrementCounter.mutate({ step });
      setCount(res.count);
    } catch (err) {
      console.error('Decrement failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = async () => {
    setIsUpdating(true);
    try {
      const res = await trpc.resetCounter.mutate();
      setCount(res.count);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    refreshCounter();
  }, [refreshCounter]);

  return {
    count,
    step,
    setStep,
    isUpdating,
    handleIncrement,
    handleDecrement,
    handleReset,
    refreshCounter,
  };
}
