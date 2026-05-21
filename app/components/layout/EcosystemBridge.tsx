import { ixaiEcosystem } from "../../lib/ecosystem";
import { ixaiIdentity } from "../../lib/identity";

// v1.18.5: brand-aligned. Was emerald-tinted (off-brand); ecosystem promo
// now uses the gold accent for chrome and cream for the primary CTA so it
// reads as IXAI ecosystem branding rather than a generic success/info box.
export function EcosystemBridge() {
  return (
    <section className="mb-5 border border-[var(--ixai-accent)]/25 bg-[var(--ixai-accent)]/[0.045] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="ds-label-sm text-[var(--ixai-accent)]">
            IXAI Ecosystem
          </div>
          <h2 className="ds-heading-sm mt-1 text-[var(--ixai-text-strong)]">
            你正在使用 IXAI Pro AI Wealth Operating System。
          </h2>
          <p className="ds-body-sm mt-1 max-w-3xl text-[var(--ixai-text-muted)]">
            返回 Public Intelligence 查看 Daily Brief、Market Intelligence 與公開研究內容。
            {ixaiIdentity.sharedAccountMessage}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="border border-[var(--ixai-accent)]/45 px-3 py-2 text-xs font-medium text-[var(--ixai-cream)] transition hover:bg-[rgba(176,141,87,0.12)]"
            href={`${ixaiEcosystem.publicAppUrl}/daily-brief`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {ixaiEcosystem.cta.openDailyBrief}
          </a>
          <a
            className="border border-[var(--ixai-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--ixai-text-muted)] transition hover:border-[var(--ixai-accent)]/40 hover:text-[var(--ixai-cream)]"
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
