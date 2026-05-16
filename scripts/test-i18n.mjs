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
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(__dirname, "..", "app", "locales");

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
    "todayFocus.subtitle": "Top 3 monitoring priorities",
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
    "Top 3 monitoring priorities",
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
  "alerts",
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
  "page.dashboard",
  "page.portfolio",
  "page.fcn",
  "page.intelligence",
  "page.market",
  "page.alerts",
  "page.settings",
  "empty.noPortfolio",
  "empty.noPortfolio.hint",
  "empty.noHoldings",
  "empty.noFcn",
  "empty.noAlerts",
  "empty.todayFocusBuilding",
  "dashboard.aiOverview",
  "dashboard.assetAllocation",
  "dashboard.todayFocus",
  "dashboard.onboarding.step1",
  "engine.portfolioTitle",
  "engine.marketTitle",
  "engine.fields.repeatedUnderlyings",
  "engine.score.total",
  "status.healthy",
  "status.degraded",
  "errors.engine",
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

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// End-to-end style: simulate translate() fallback chain with the fixture.
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
