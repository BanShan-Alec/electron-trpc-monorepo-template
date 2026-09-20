import type React from 'react';
import { Badge, Button } from '../../../components/ui';
import type { UpdateState } from '../types';

export interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  updateState: UpdateState;
  isChecking: boolean;
  onCheck: () => void;
  onDownload: () => void;
  onInstall: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  updateState,
  isChecking,
  onCheck,
  onDownload,
  onInstall,
}) => {
  if (!isOpen) return null;

  const { status, updateInfo, progress, error } = updateState;
  const targetVersion = updateInfo?.version || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-background-secondary border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-background/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔄</span>
            <h3 className="text-base font-semibold text-foreground">软件版本与更新</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground-secondary hover:text-foreground p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Version Header */}
          <div className="flex items-center justify-between bg-background/60 p-3.5 rounded-xl border border-border/60">
            <div>
              <span className="text-xs text-foreground-secondary block">当前运行版本</span>
              <span className="text-sm font-semibold font-mono text-foreground">
                v{currentVersion}
              </span>
            </div>
            {targetVersion && (
              <div className="text-right">
                <span className="text-xs text-foreground-secondary block">最新可用版本</span>
                <span className="text-sm font-semibold font-mono text-primary">
                  v{targetVersion}
                </span>
              </div>
            )}
          </div>

          {/* Status View: Checking */}
          {(status === 'checking' || isChecking) && (
            <div className="flex flex-col items-center py-6 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-foreground-secondary">正在连接 GitHub 检查新版本...</p>
            </div>
          )}

          {/* Status View: Not Available (Up to date) */}
          {status === 'not-available' && !isChecking && (
            <div className="flex flex-col items-center py-5 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h4 className="text-sm font-medium text-foreground">当前已是最新版本</h4>
              <p className="text-xs text-foreground-secondary">
                无需更新，你的客户端已具备最新特性与安全修复。
              </p>
            </div>
          )}

          {/* Status View: Update Available */}
          {status === 'available' && !isChecking && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="success" size="md">
                  发现新版本 v{targetVersion}
                </Badge>
                {updateInfo?.releaseDate && (
                  <span className="text-[11px] text-foreground-secondary">
                    {new Date(updateInfo.releaseDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Release Notes */}
              <div className="bg-background/80 rounded-xl p-3.5 border border-border/80 text-xs text-foreground-secondary max-h-36 overflow-y-auto space-y-1">
                <p className="font-semibold text-foreground mb-1">更新说明：</p>
                {typeof updateInfo?.releaseNotes === 'string' ? (
                  <div
                    className="whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }}
                  />
                ) : (
                  <p className="text-foreground-secondary">
                    包含性能提升与缺陷修复，建议立即更新。
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status View: Downloading */}
          {status === 'downloading' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-secondary font-medium">正在下载更新包...</span>
                <span className="font-mono text-primary font-semibold">
                  {progress ? `${progress.percent}%` : '准备中...'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>

              {/* Progress Details */}
              {progress && (
                <div className="flex items-center justify-between text-[11px] text-foreground-secondary font-mono">
                  <span>速度: {formatBytes(progress.bytesPerSecond)}/s</span>
                  <span>
                    {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status View: Downloaded */}
          {status === 'downloaded' && (
            <div className="flex flex-col items-center py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold">
                🚀
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">更新包已就绪！</h4>
                <p className="text-xs text-foreground-secondary mt-1">
                  新版本已下载完毕，重启应用即可完成升级安装。
                </p>
              </div>
            </div>
          )}

          {/* Status View: Error */}
          {status === 'error' && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3.5 text-xs text-danger space-y-1">
              <span className="font-semibold block">⚠️ 更新检测或下载出错</span>
              <p className="break-all">{error || '网络异常或未配置更新源'}</p>
            </div>
          )}

          {/* Status View: Idle */}
          {status === 'idle' && !isChecking && (
            <p className="text-xs text-foreground-secondary leading-relaxed">
              点击下方按钮即可联网检查 GitHub 是否有新版本发布。
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/80 bg-background/40">
          <Button variant="secondary" size="sm" onClick={onClose}>
            关闭
          </Button>

          {status === 'available' && (
            <Button variant="primary" size="sm" onClick={onDownload}>
              📥 立即下载更新
            </Button>
          )}

          {status === 'downloaded' && (
            <Button variant="success" size="sm" onClick={onInstall}>
              ⚡ 立即重启并安装
            </Button>
          )}

          {(status === 'idle' || status === 'not-available' || status === 'error') && (
            <Button variant="primary" size="sm" onClick={onCheck} isLoading={isChecking}>
              🔍 检查更新
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
