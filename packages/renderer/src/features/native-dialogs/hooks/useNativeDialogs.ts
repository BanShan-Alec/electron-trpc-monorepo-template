import { useState } from 'react';
import { trpc } from '../../../trpc';

export function useNativeDialogs() {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenFile = async () => {
    setIsLoading(true);
    try {
      const res = await trpc.openFileDialog.mutate({
        title: '选择测试文件',
      });
      if (!res.canceled && res.filePaths.length > 0) {
        setSelectedPath(res.filePaths[0]);
        setStatusMessage(`已选择文件: ${res.filePaths[0]}`);
      } else {
        setStatusMessage('用户取消了选择');
      }
    } catch (err) {
      setStatusMessage(`打开失败: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDirectory = async () => {
    setIsLoading(true);
    try {
      const res = await trpc.openDirectoryDialog.mutate({
        title: '选择测试文件夹',
      });
      if (!res.canceled && res.filePaths.length > 0) {
        setSelectedPath(res.filePaths[0]);
        setStatusMessage(`已选择文件夹: ${res.filePaths[0]}`);
      } else {
        setStatusMessage('用户取消了选择');
      }
    } catch (err) {
      setStatusMessage(`打开失败: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFile = async () => {
    setIsLoading(true);
    try {
      const res = await trpc.saveFileDialog.mutate({
        title: '另存为示例',
        defaultPath: 'example.txt',
      });
      if (!res.canceled && res.filePath) {
        setSelectedPath(res.filePath);
        setStatusMessage(`保存路径已选定: ${res.filePath}`);
      } else {
        setStatusMessage('用户取消了保存');
      }
    } catch (err) {
      setStatusMessage(`保存失败: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowInFolder = async () => {
    if (!selectedPath) return;
    try {
      await trpc.showItemInFolder.mutate({ path: selectedPath });
      setStatusMessage(`已在资源管理器中定位: ${selectedPath}`);
    } catch (err) {
      setStatusMessage(`定位失败: ${String(err)}`);
    }
  };

  return {
    selectedPath,
    statusMessage,
    isLoading,
    handleOpenFile,
    handleOpenDirectory,
    handleSaveFile,
    handleShowInFolder,
  };
}
