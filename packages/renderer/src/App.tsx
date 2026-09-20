import { useState } from 'react';
import { Header } from './components/layout';
import { ArchitectureView } from './features/architecture';
import { CalculatorCard, useCalculator } from './features/calculator';
import { CounterCard, useCounter } from './features/counter';
import { DevToolsCard, LoggingCard, useDiagnostics } from './features/diagnostics';
import { DialogCard, useNativeDialogs } from './features/native-dialogs';
import { SettingsCard, useAppConfig } from './features/settings';
import { PingCard, SystemInfoCard, useSystemInfo } from './features/system-info';
import { UpdateModal, useUpdater } from './features/updater';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'architecture'>('dashboard');

  // Feature Hooks
  const systemInfo = useSystemInfo();
  const counter = useCounter();
  const calculator = useCalculator();
  const settings = useAppConfig();
  const dialogs = useNativeDialogs();
  const diagnostics = useDiagnostics();
  const updater = useUpdater();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30">
      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        version={updater.currentVersion}
        hasUpdate={updater.updateState.hasUpdate}
        onOpenUpdateModal={updater.openModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto stable-scrollbar">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* System Info & Ping */}
            <PingCard
              latency={systemInfo.pingLatency}
              serverTime={systemInfo.serverTime}
              isPinging={systemInfo.isPinging}
              onPing={systemInfo.handlePing}
            />

            <SystemInfoCard
              systemInfo={systemInfo.systemInfo}
              isLoading={systemInfo.isFetchingInfo}
              onRefresh={systemInfo.fetchSystemInfo}
            />

            {/* Counter & State Persistence */}
            <CounterCard
              count={counter.count}
              step={counter.step}
              onStepChange={counter.setStep}
              isUpdating={counter.isUpdating}
              onIncrement={counter.handleIncrement}
              onDecrement={counter.handleDecrement}
              onReset={counter.handleReset}
            />

            {/* Safe RPC Calculator */}
            <CalculatorCard
              a={calculator.a}
              b={calculator.b}
              op={calculator.op}
              onAChange={calculator.setA}
              onBChange={calculator.setB}
              onOpChange={calculator.setOp}
              result={calculator.result}
              error={calculator.error}
              isLoading={calculator.isLoading}
              onCalculate={calculator.calculate}
            />

            {/* App Settings & ConfigStore */}
            <SettingsCard
              appConfig={settings.appConfig}
              onUpdate={settings.handleUpdateConfig}
              onReset={settings.handleResetConfig}
              isLoading={settings.isLoading}
            />

            {/* Native Dialogs */}
            <DialogCard
              selectedPath={dialogs.selectedPath}
              statusMessage={dialogs.statusMessage}
              isLoading={dialogs.isLoading}
              onOpenFile={dialogs.handleOpenFile}
              onOpenDirectory={dialogs.handleOpenDirectory}
              onSaveFile={dialogs.handleSaveFile}
              onShowInFolder={dialogs.handleShowInFolder}
            />

            {/* Logging & Rotation */}
            <LoggingCard
              logStatus={diagnostics.logStatus}
              isLoading={diagnostics.isLoading}
              onSendLog={diagnostics.handleSendLog}
              onOpenLogFolder={diagnostics.handleOpenLogFolder}
            />

            {/* DevTools & External Links */}
            <DevToolsCard
              actionMessage={diagnostics.actionMessage}
              onToggleDevTools={diagnostics.handleToggleDevTools}
              onOpenDocs={diagnostics.handleOpenDocs}
            />
          </div>
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Software Update Modal */}
      <UpdateModal
        isOpen={updater.isModalOpen}
        onClose={updater.closeModal}
        currentVersion={updater.currentVersion}
        updateState={updater.updateState}
        isChecking={updater.isChecking}
        onCheck={updater.checkForUpdates}
        onDownload={updater.downloadUpdate}
        onInstall={updater.installUpdateAndRestart}
      />
    </div>
  );
}
