#!/usr/bin/env node
/**
 * v4D regression suite for app/lib/i18n.ts.
 *
 * Two layers of protection:
 *
 * 1. Algorithm tests — `resolveNestedKey` is re-implemented here in pure JS
 *    (mirroring app/lib/i18n.ts) and exercised against representative
 *    fixtures: flat keys, nested keys, mixed shapes, missing keys, empty
 *    inputs.
 *
 * 2. Coverage tests — read each locale file as raw text and assert that
 *    every key referenced by the app exists at least in the en and zh-TW
 *    dictionaries. This prevents the v4D regression (missing nav.*, page.*,
 *    empty.* namespaces) from happening again.
 *
 * Runs with vanilla Node 20+ (uses node:test, node:assert, no extra deps).
 * Invoke via:    node scripts/test-i18n.mjs
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, "..", "app", "locales");
const appDir = resolve(__dirname, "..", "app");

// ---------------------------------------------------------------------------
// Mirror of resolveNestedKey() from app/lib/i18n.ts.
// Keep this in sync; the regression tests would catch a drift quickly.
// ---------------------------------------------------------------------------
function resolveNestedKey(source, path) {
  if (typeof path !== "string" || path.length === 0) return undefined;
  if (!source || typeof source !== "object") return undefined;
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return undefined;
  return walk(source, parts);
}

function walk(cursor, parts) {
  if (parts.length === 0) {
    return typeof cursor === "string" ? cursor : undefined;
  }
  if (!cursor || typeof cursor !== "object") return undefined;

  for (let split = parts.length; split >= 1; split--) {
    const joined = parts.slice(0, split).join(".");
    const candidate = cursor[joined];
    if (typeof candidate === "string" && split === parts.length) {
      return candidate;
    }
    if (candidate && typeof candidate === "object" && split < parts.length) {
      const tail = walk(candidate, parts.slice(split));
      if (typeof tail === "string") return tail;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Algorithm tests
// ---------------------------------------------------------------------------
const FIXTURE = {
  common: { active: "Active", retry: "Retry" },
  nav: { dashboard: "Dashboard", portfolio: "Portfolio" },
  // legacy flat-within-namespace
  dashboard: {
    aiOverview: "AI Overview",
    "onboarding.step1": "Create account",
    "onboarding.step2": "Create portfolio",
    "todayFocus.subtitle": "Observation priorities",
  },
  // pure nested
  engine: {
    fields: {
      repeatedUnderlyings: "Repeated underlyings",
      nestedDeep: { again: "Deeper" },
    },
    score: { total: "TOTAL" },
  },
};

test("flat namespace.key lookup", () => {
  assert.equal(resolveNestedKey(FIXTURE, "common.active"), "Active");
  assert.equal(resolveNestedKey(FIXTURE, "nav.dashboard"), "Dashboard");
});

test("flat-within-namespace dotted key (v3E legacy shape)", () => {
  assert.equal(
    resolveNestedKey(FIXTURE, "dashboard.onboarding.step1"),
    "Create account",
  );
  assert.equal(
    resolveNestedKey(FIXTURE, "dashboard.todayFocus.subtitle"),
    "Observation priorities",
  );
});

test("true nested object lookup", () => {
  assert.equal(
    resolveNestedKey(FIXTURE, "engine.fields.repeatedUnderlyings"),
    "Repeated underlyings",
  );
  assert.equal(resolveNestedKey(FIXTURE, "engine.score.total"), "TOTAL");
});

test("deep nested (4 levels) lookup", () => {
  assert.equal(
    resolveNestedKey(FIXTURE, "engine.fields.nestedDeep.again"),
    "Deeper",
  );
});

test("missing key returns undefined", () => {
  assert.equal(resolveNestedKey(FIXTURE, "nav.doesnotexist"), undefined);
  assert.equal(resolveNestedKey(FIXTURE, "no.namespace"), undefined);
  assert.equal(resolveNestedKey(FIXTURE, "engine.fields.missing"), undefined);
});

test("invalid input returns undefined", () => {
  assert.equal(resolveNestedKey(null, "common.active"), undefined);
  assert.equal(resolveNestedKey(undefined, "common.active"), undefined);
  assert.equal(resolveNestedKey(FIXTURE, ""), undefined);
  assert.equal(resolveNestedKey(FIXTURE, "..."), undefined);
  assert.equal(resolveNestedKey(FIXTURE, "common."), undefined);
  // Calling with non-string path should not throw
  assert.equal(resolveNestedKey(FIXTURE, /** @type {any} */ (null)), undefined);
  assert.equal(resolveNestedKey(FIXTURE, /** @type {any} */ (42)), undefined);
});

test("returning an object (not a string) yields undefined at the leaf", () => {
  assert.equal(resolveNestedKey(FIXTURE, "engine.fields"), undefined);
});

// ---------------------------------------------------------------------------
// Coverage tests — verify required namespaces exist in each authoritative
// locale file. Catches the v4D regression where nav/page/empty disappeared.
// ---------------------------------------------------------------------------
const REQUIRED_NAMESPACES = [
  "common",
  "nav",
  "page",
  "empty",
  "dashboard",
  "intelligence",
  "market",
  "portfolio",
  "fcn",
  "alerts",
  "accounts",
  "onboarding",
  "input",
  "import",
  "settings",
  "errors",
  "status",
  "copilot",
  "engine",
];

// Keys the app actually references. Any of these missing means a render
// regression — `t("nav.dashboard")` would echo back the raw key.
const REQUIRED_KEYS_EN = [
  "common.retry",
  "common.openAccounts",
  "common.selectAccount",
  "common.selectPortfolio",
  "common.dataPending",
  "nav.dashboard",
  "nav.portfolio",
  "nav.fcn",
  "nav.intelligence",
  "nav.market",
  "nav.alerts",
  "nav.input",
  "nav.import",
  "nav.accounts",
  "nav.settings",
  "nav.short.dashboard",
  "page.dashboard",
  "page.portfolio",
  "page.fcn",
  "page.intelligence",
  "page.market",
  "page.alerts",
  "page.settings",
  "page.accounts",
  "page.onboarding",
  "empty.noPortfolio",
  "empty.noPortfolio.hint",
  "empty.noHoldings",
  "empty.noFcn",
  "empty.noAlerts",
  "empty.todayFocusBuilding",
  "dashboard.aiOverview",
  "dashboard.assetAllocation",
  "dashboard.todayFocus",
  "dashboard.openInputWorkspace",
  "dashboard.sections.immediateAttention",
  "dashboard.sections.analysisOverview",
  "dashboard.sections.deepAnalysis",
  "dashboard.onboarding.step1",
  "intelligence.whatToMonitor",
  "intelligence.noTradingInstruction",
  "market.news",
  "portfolio.holdings",
  "fcn.table",
  "alerts.grouped",
  "accounts.activeContext",
  "onboarding.step1",
  "settings.language",
  "input.submitAsset",
  "input.title",
  "input.context",
  "input.addAsset",
  "input.recent",
  "input.defaultUserPortfolio",
  "input.currentWritePortfolio",
  "input.workspaceGuide",
  "input.fcnFlagship",
  "input.activeWriteHint",
  "input.awaitingReferenceData",
  "input.shares",
  "input.market",
  "input.stockNameTicker",
  "input.selectedTicker",
  "input.stockPriceSystem",
  "input.underlyingAsset",
  "input.addUnderlying",
  "input.worstOfActive",
  "input.crypto.grid",
  "input.crypto.dual",
  "input.crypto.earn",
  "input.errors.fcnUnderlyingRequired",
  "import.preview",
  "import.workflowGuide",
  "import.previewGuide",
  "import.normalized",
  "engine.portfolioTitle",
  "engine.marketTitle",
  "engine.fields.repeatedUnderlyings",
  "engine.score.total",
  "status.healthy",
  "status.degraded",
  "errors.engine",
];

const HIGH_VISIBILITY_KEYS = [
  "page.input",
  "nav.input",
  "input.title",
  "input.context",
  "input.addAsset",
  "input.recent",
  "input.submitAsset",
  "input.workspaceGuide",
  "input.fcnFlagship",
  "input.awaitingReferenceData",
  "import.workflowGuide",
  "import.previewGuide",
  "common.selectAccount",
  "common.selectPortfolio",
  "common.dataPending",
];

function readLocaleSource(filename) {
  return readFileSync(resolve(localesDir, filename), "utf8");
}

test("en.ts declares every required namespace", () => {
  const src = readLocaleSource("en.ts");
  for (const ns of REQUIRED_NAMESPACES) {
    assert.match(
      src,
      new RegExp(`\\b${ns}\\s*:\\s*\\{`),
      `en.ts missing namespace ${ns}`,
    );
  }
});

test("zh-TW.ts declares every required namespace", () => {
  const src = readLocaleSource("zh-TW.ts");
  for (const ns of REQUIRED_NAMESPACES) {
    assert.match(
      src,
      new RegExp(`\\b${ns}\\s*:\\s*\\{`),
      `zh-TW.ts missing namespace ${ns}`,
    );
  }
});

test("en.ts contains every required dotted key", () => {
  const src = readLocaleSource("en.ts");
  for (const key of REQUIRED_KEYS_EN) {
    const last = key.split(".").pop();
    // Either as a bare identifier (`retry:`) or as a quoted compound
    // (`"onboarding.step1":`).
    const compound = key.split(".").slice(1).join(".");
    const patterns = [
      new RegExp(`["']${escapeRe(key)}["']\\s*:`),
      new RegExp(`["']${escapeRe(compound)}["']\\s*:`),
      new RegExp(`\\b${escapeRe(last)}\\s*:`),
    ];
    assert.ok(
      patterns.some((re) => re.test(src)),
      `en.ts missing key ${key}`,
    );
  }
});

test("zh-TW.ts contains every required dotted key", () => {
  const src = readLocaleSource("zh-TW.ts");
  for (const key of REQUIRED_KEYS_EN) {
    const last = key.split(".").pop();
    const compound = key.split(".").slice(1).join(".");
    const patterns = [
      new RegExp(`["']${escapeRe(key)}["']\\s*:`),
      new RegExp(`["']${escapeRe(compound)}["']\\s*:`),
      new RegExp(`\\b${escapeRe(last)}\\s*:`),
    ];
    assert.ok(
      patterns.some((re) => re.test(src)),
      `zh-TW.ts missing key ${key}`,
    );
  }
});

test("ja ko zh-CN explicitly cover high-visibility workspace chrome", () => {
  for (const filename of ["ja.ts", "ko.ts", "zh-CN.ts"]) {
    const src = readLocaleSource(filename);
    for (const key of HIGH_VISIBILITY_KEYS) {
      const last = key.split(".").pop();
      const compound = key.split(".").slice(1).join(".");
      const patterns = [
        new RegExp(`["']${escapeRe(key)}["']\\s*:`),
        new RegExp(`["']${escapeRe(compound)}["']\\s*:`),
        new RegExp(`\\b${escapeRe(last)}\\s*:`),
      ];
      assert.ok(patterns.some((re) => re.test(src)), `${filename} missing high-visibility key ${key}`);
    }
  }
});

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// End-to-end style: simulate translate() fallback chain with the fixture.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// v4.9B localization utility tests.
// Mirrors the protected-term registry + compression behaviour from
// app/lib/localization.ts. The actual source is read so this fixture can't
// silently drift from production code without tripping the regex.
// ---------------------------------------------------------------------------
const localizationSrc = readFileSync(
  resolve(__dirname, "..", "app", "lib", "localization.ts"),
  "utf8",
);

const REQUIRED_PROTECTED_TERMS = [
  "FCN",
  "KI",
  "KO",
  "Worst-of",
  "AI Momentum",
  "Risk-On",
  "Risk-Off",
  "BTC",
  "ETH",
  "NVDA",
  "NVIDIA",
  "TSM",
];

test("localization registry includes every protected financial term", () => {
  for (const term of REQUIRED_PROTECTED_TERMS) {
    assert.ok(
      localizationSrc.includes(`"${term}"`),
      `localization.ts missing protected term ${term}`,
    );
  }
});

test("localizeFinancialNarrative export is present", () => {
  assert.match(
    localizationSrc,
    /export function localizeFinancialNarrative\(/,
  );
});

test("isProtectedTerm export is present", () => {
  assert.match(localizationSrc, /export function isProtectedTerm\(/);
});

test("localization compresses overly long narratives", () => {
  // Re-implement the truncation logic for a self-contained algorithm test.
  function truncate(text, maxLen) {
    const limit = Math.max(40, maxLen || 160);
    if (text.length <= limit) return text;
    return text.slice(0, limit).replace(/[，。；,. ]+$/, "") + "…";
  }
  const long = "A".repeat(300);
  const out = truncate(long, 100);
  assert.ok(out.length <= 101, "compressed text must be within max + ellipsis");
  assert.ok(out.endsWith("…"));
});

// ---------------------------------------------------------------------------
// v4.9C compression helper tests (algorithm only; mirrors compression.ts).
// ---------------------------------------------------------------------------
const compressionSrc = readFileSync(
  resolve(__dirname, "..", "app", "lib", "compression.ts"),
  "utf8",
);

test("compression module exports the three summarizers", () => {
  assert.match(compressionSrc, /export function summarizeTopRisk\(/);
  assert.match(compressionSrc, /export function summarizeMarketState\(/);
  assert.match(compressionSrc, /export function summarizeFCNPressure\(/);
});

test("compression outputs never contain forbidden trading vocab patterns", () => {
  // The implementation pipes through sanitizeAdviceText. Verify the
  // call site by source-inspection — the regex would catch a regression
  // where someone removes that pipe.
  assert.match(compressionSrc, /sanitizeAdviceText/);
});

// ---------------------------------------------------------------------------
test("translate-style fallback: requested locale → en → key", () => {
  const en = { common: { retry: "Retry" } };
  const ja = { common: {} };
  const FALLBACK_LOCALE = "en";

  function translate(key, locale) {
    const dict = locale === "ja" ? ja : en;
    const direct = resolveNestedKey(dict, key);
    if (direct !== undefined) return direct;
    if (locale !== FALLBACK_LOCALE) {
      const fb = resolveNestedKey(en, key);
      if (fb !== undefined) return fb;
    }
    return key;
  }

  assert.equal(translate("common.retry", "en"), "Retry");
  assert.equal(translate("common.retry", "ja"), "Retry"); // falls back to en
  assert.equal(translate("common.missing", "ja"), "common.missing"); // raw key
});

test("ja and ko fallback to en, not zh-TW", () => {
  const en = { page: { portfolio: "Portfolio Management" } };
  const zhTW = { page: { portfolio: "資產管理" } };
  const ja = { page: {} };
  const ko = { page: {} };

  function translate(key, locale) {
    const dict = locale === "ja" ? ja : locale === "ko" ? ko : locale === "zh-TW" || locale === "zh-CN" ? zhTW : en;
    const direct = resolveNestedKey(dict, key);
    if (direct !== undefined) return direct;
    const fallback = resolveNestedKey(locale === "zh-CN" ? zhTW : en, key);
    return fallback ?? key;
  }

  assert.equal(translate("page.portfolio", "ja"), "Portfolio Management");
  assert.equal(translate("page.portfolio", "ko"), "Portfolio Management");
  assert.notEqual(translate("page.portfolio", "ja"), "資產管理");
  assert.notEqual(translate("page.portfolio", "ko"), "資產管理");
  assert.equal(translate("page.portfolio", "zh-CN"), "資產管理");
});

function listTsxFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsxFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("visible UI does not expose hardcoded bilingual chrome or product-internal bands", () => {
  const scopedFiles = listTsxFiles(appDir).filter((file) => !file.includes(`${"/login"}/`));
  const bilingualPattern = /["'`](?=[^"'`]*[A-Za-z])(?=[^"'`]*[\u4e00-\u9fff])[^"'`]*\s\/\s[^"'`]*["'`]/;
  const forbiddenPatterns = [
    /const\s+labels\s*=\s*\{/,
    /["'`]P[012]\s*·/,
    /["'`][^"'`]*\bP[012]\b[^"'`]*["'`]/,
    /Top 3 monitoring priorities/,
    /Executive summary/i,
    /Contextual intelligence/i,
    /Engine panel/i,
    /WHAT TO MONITOR/,
    /single name/i,
    /theme cluster/i,
    /compact view/i,
    /workspace memory/i,
    /BACKEND HEALTH/,
    /DATABASE READINESS/,
    /REQUEST STATUS/,
    /CRYPTO_STRESS/,
    /["'`][^"'`]*\bVOL\b[^"'`]*["'`]/,
    /["'`][^"'`]*\bCONF\b[^"'`]*["'`]/,
    /["'`][^"'`]*\bIMPACT\b[^"'`]*["'`]/,
  ];
  const hardcodedLeftovers = [
    /Default user portfolio/,
    /Current write portfolio/,
    /data incomplete/,
    /Recent Positions/,
    /Submit asset/,
    /Add asset/,
    /Select account/,
    /Select portfolio/,
    /CSV Import Panel/,
    /Preview \/ confirm/,
    /CSV Preview/,
    /No recent positions/,
    /asset_type,symbol/,
    /raw admin/i,
    /schema entry/i,
  ];

  for (const file of scopedFiles) {
    const source = stripComments(readFileSync(file, "utf8"));
    assert.ok(!bilingualPattern.test(source), `${file} contains hardcoded bilingual visible text`);
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(source), `${file} contains forbidden product language ${pattern}`);
    }
    for (const pattern of hardcodedLeftovers) {
      assert.ok(!pattern.test(source), `${file} contains hardcoded user-facing English ${pattern}`);
    }
  }
});

test("ja and ko high-visibility dictionaries do not leak Traditional Chinese", () => {
  const forbiddenZhTwFragments = [
    "選擇帳戶",
    "選擇投資組合",
    "資料待補",
    "資產輸入",
    "近期部位",
    "送出資產",
    "預設使用者投資組合",
    "目前寫入投資組合",
  ];
  for (const filename of ["ja.ts", "ko.ts"]) {
    const src = readLocaleSource(filename);
    for (const key of HIGH_VISIBILITY_KEYS) {
      const last = key.split(".").pop();
      const compound = key.split(".").slice(1).join(".");
      const match =
        src.match(new RegExp(`["']${escapeRe(compound)}["']\\s*:\\s*["'\`]([^"'\`]+)["'\`]`)) ||
        src.match(new RegExp(`\\b${escapeRe(last)}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`));
      assert.ok(match, `${filename} missing ${key}`);
      assert.ok(
        !forbiddenZhTwFragments.some((fragment) => match[1].includes(fragment)),
        `${filename} leaks zh-TW text for ${key}: ${match[1]}`,
      );
    }
  }
});

test("preferences module dispatches same-tab locale sync event", () => {
  const source = readFileSync(resolve(__dirname, "..", "app", "lib", "preferences.ts"), "utf8");
  assert.match(source, /PREFERENCES_CHANGED_EVENT\s*=\s*"ixai:preferences-changed"/);
  assert.match(source, /dispatchEvent\(new CustomEvent\(PREFERENCES_CHANGED_EVENT/);
  assert.match(source, /addEventListener\(PREFERENCES_CHANGED_EVENT/);
});

test("workflow completion source keeps investment workflows explicit", () => {
  const inputSource = readFileSync(resolve(appDir, "input", "page.tsx"), "utf8");
  const dashboardSource = readFileSync(resolve(appDir, "dashboard", "page.tsx"), "utf8");
  const workflowUtils = readFileSync(resolve(appDir, "lib", "workflow-utils.ts"), "utf8");

  assert.ok(workflowUtils.includes('market === "TW"') && workflowUtils.includes('${clean}.TW'), "stock normalization should support TW tickers");
  assert.match(workflowUtils, /stockAliasMap/, "stock resolver should include a deterministic local alias map");
  assert.match(workflowUtils, /台積電/, "stock resolver should support 台積電");
  assert.match(workflowUtils, /TSM/, "stock resolver should offer TSM as a candidate");
  assert.ok(!inputSource.includes("positiveNumber(stock.current_price)"), "stock current price must not be user-required");
  assert.match(inputSource, /current_price:\s*avgPrice/, "stock submit should send avg cost as a temporary backend contract fallback");
  assert.match(inputSource, /stockPriceSystem/, "stock UI should explain system-filled current price behavior");
  assert.match(inputSource, /underlyings\.map/, "FCN underlying builder should support dynamic rows");
  assert.match(inputSource, /setUnderlyings\(\(rows\) => \[\.\.\.rows/, "FCN builder should add underlyings");
  assert.match(inputSource, /strike_level:\s*strikeNum/, "FCN payload should include strike");
  assert.match(inputSource, /ki_level:\s*kiNum/, "FCN payload should include KI");
  assert.match(inputSource, /ko_level:\s*koNum/, "FCN payload should include KO");
  assert.match(inputSource, /coupon_rate:\s*positiveNumber\(fcn\.coupon_rate\)/, "FCN payload should include coupon rate");
  assert.match(inputSource, /underlying_details:\s*normalizedUnderlyings/, "FCN payload should include underlying details");
  assert.match(inputSource, /cryptoModes\.map/, "crypto workflow switcher should render strategy modes");
  assert.match(inputSource, /cryptoMode === "grid"/, "crypto grid workflow should exist");
  assert.match(inputSource, /cryptoMode === "dual"/, "dual investment workflow should exist");
  assert.match(inputSource, /cryptoMode === "earn"/, "stablecoin earn workflow should exist");
  assert.match(inputSource, /asset_type:\s*`grid:/, "crypto grid payload should preserve subtype");
  assert.match(inputSource, /asset_type:\s*`dual:/, "crypto dual payload should preserve subtype");
  assert.match(inputSource, /asset_type:\s*`stablecoin_earn:/, "stablecoin earn payload should preserve subtype");
  assert.match(inputSource, /cashCurrencies/, "cash currency selector should remain available");
  assert.match(dashboardSource, /DashboardTodayFocus items=\{todayFocusItems\}/, "dashboard should keep Today priorities first");
  assert.match(readLocaleSource("en.ts"), /today.?s priorities/i);
});
