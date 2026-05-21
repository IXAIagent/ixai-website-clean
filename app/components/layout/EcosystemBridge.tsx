import { ixaiEcosystem } from "../../lib/ecosystem";

export function EcosystemBridge() {
  return (
    <section className="mb-5 border border-emerald-400/20 bg-emerald-400/[0.045] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
            IXAI Ecosystem
          </div>
          <h2 className="mt-1 text-sm font-semibold text-zinc-100">
            你正在使用 IXAI Pro AI Wealth Operating System。
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-6 text-zinc-500">
            返回 Public Intelligence 查看 Daily Brief、Market Intelligence 與公開研究內容。
            未來將支援 Public App 與 IXAI Pro 共用帳號與 Watchlist 同步。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="border border-emerald-400/40 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/10"
            href={`${ixaiEcosystem.publicAppUrl}/daily-brief`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {ixaiEcosystem.cta.openDailyBrief}
          </a>
          <a
            className="border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
            href={`${ixaiEcosystem.publicAppUrl}/market`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {ixaiEcosystem.cta.openMarketIntelligence}
          </a>
        </div>
      </div>
    </section>
  );
}
