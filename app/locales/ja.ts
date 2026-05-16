// v4D: Japanese locale. Cascade from English for keys not translated.

import en from "./en";
import type { Dictionary } from "./types";

const ja: Dictionary = {
  ...en,
  common: {
    ...en.common,
    loading: "読み込み中",
    error: "エラー",
    fresh: "最新",
    stale: "古い",
    monitoringOnly: "観察のみ — 取引指示ではありません",
  },
  status: {
    ...en.status,
    healthy: "正常",
    partial: "部分劣化",
    degraded: "劣化",
    unavailable: "利用不可",
    clear: "正常",
    watch: "観察",
    elevated: "上昇",
    critical: "重大",
  },
  dashboard: {
    ...en.dashboard,
    title: "ダッシュボード",
    aiOverview: "AI 概要",
    todayFocus: "本日のフォーカス",
  },
  intelligence: {
    ...en.intelligence,
    title: "Intelligence",
    portfolioEngine: "ポートフォリオエンジン",
    marketEngine: "マーケットエンジン",
  },
  market: {
    ...en.market,
    title: "マーケット",
    regime: "市場レジーム",
    volatility: "ボラティリティ",
  },
};

export default ja;
