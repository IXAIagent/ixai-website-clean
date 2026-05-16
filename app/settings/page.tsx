"use client";

import { AppShell } from "../components/layout/AppShell";
import { TerminalPanel } from "../components/layout/TerminalPanel";

export default function SettingsPage() {
  return (
    <AppShell
      title="Settings / 設定"
      subtitle="Account, language and notification settings foundation."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <TerminalPanel title="Language" meta="future i18n">
          <div className="font-mono text-xs text-zinc-400">
            Locale settings will support English / 繁體中文 in a later batch.
          </div>
        </TerminalPanel>
        <TerminalPanel title="Account" meta="v3 foundation">
          <div className="font-mono text-xs text-zinc-400">
            Multi-account and portfolio switching will connect to backend v3 foundation next.
          </div>
        </TerminalPanel>
        <TerminalPanel title="Notifications" meta="placeholder">
          <div className="font-mono text-xs text-zinc-400">
            Email, Telegram and portfolio intelligence notifications will be configured here.
          </div>
        </TerminalPanel>
      </div>
    </AppShell>
  );
}
