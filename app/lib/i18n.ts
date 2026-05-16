"use client";

import { defaultPreferences, SupportedLocale, usePreferences } from "./preferences";

type Dictionary = Record<string, string>;

const zhTW: Dictionary = {
  "common.active": "Active / 啟用",
  "common.error": "Error / 錯誤",
  "common.fresh": "Fresh / 最新",
  "common.loading": "Loading / 載入中",
  "common.stale": "Stale / 過期",
  "common.unknown": "Unknown / 未知",
  "nav.accounts": "Accounts / 帳戶",
  "nav.alerts": "Alerts / 警示",
  "nav.dashboard": "Dashboard / 投資總覽",
  "nav.fcn": "FCN / FCN 監控",
  "nav.import": "Import / 匯入",
  "nav.input": "Input / 資產輸入",
  "nav.intelligence": "Intelligence / AI 分析",
  "nav.market": "Market / 市場",
  "nav.portfolio": "Portfolio / 資產",
  "nav.settings": "Settings / 設定",
  "page.accounts": "Accounts / 帳戶",
  "page.alerts": "Alerts / 警示中心",
  "page.dashboard": "Dashboard / 投資總覽",
  "page.fcn": "FCN Risk Workspace / FCN 風險監控",
  "page.import": "Import / 匯入",
  "page.input": "Input / 資產輸入",
  "page.intelligence": "Intelligence / AI 分析",
  "page.market": "Market / 市場情報",
  "page.portfolio": "Portfolio / 資產管理",
  "page.settings": "Settings / 設定",
  "settings.compliance": "Compliance / Disclaimer",
  "settings.dataSources": "Data Source Status",
  "settings.intelligence": "Intelligence Preferences",
  "settings.language": "Language / Locale Preferences",
  "settings.notifications": "Notification Preferences",
  "settings.profile": "Profile / Account",
  "settings.system": "API / System Health",
  "settings.workspace": "Workspace Preferences",
  "dashboard.aiOverview": "今日總結 / AI Overview",
  "dashboard.assetAllocation": "Asset Allocation / 資產配置",
  "dashboard.criticalFCN": "FCN Critical Watch / FCN 重點監控",
  "dashboard.scheduler": "Scheduler / Memory Freshness",
  "dashboard.topAlerts": "Top Alerts / 重要警示",
};

const en: Dictionary = {
  "common.active": "Active",
  "common.error": "Error",
  "common.fresh": "Fresh",
  "common.loading": "Loading",
  "common.stale": "Stale",
  "common.unknown": "Unknown",
  "nav.accounts": "Accounts",
  "nav.alerts": "Alerts",
  "nav.dashboard": "Dashboard",
  "nav.fcn": "FCN",
  "nav.import": "Import",
  "nav.input": "Input",
  "nav.intelligence": "Intelligence",
  "nav.market": "Market",
  "nav.portfolio": "Portfolio",
  "nav.settings": "Settings",
  "page.accounts": "Accounts",
  "page.alerts": "Alerts Center",
  "page.dashboard": "Dashboard",
  "page.fcn": "FCN Risk Workspace",
  "page.import": "Import",
  "page.input": "Input",
  "page.intelligence": "Intelligence",
  "page.market": "Market",
  "page.portfolio": "Portfolio Management",
  "page.settings": "Settings",
  "settings.compliance": "Compliance / Disclaimer",
  "settings.dataSources": "Data Source Status",
  "settings.intelligence": "Intelligence Preferences",
  "settings.language": "Language / Locale Preferences",
  "settings.notifications": "Notification Preferences",
  "settings.profile": "Profile / Account",
  "settings.system": "API / System Health",
  "settings.workspace": "Workspace Preferences",
  "dashboard.aiOverview": "AI Overview",
  "dashboard.assetAllocation": "Asset Allocation",
  "dashboard.criticalFCN": "FCN Critical Watch",
  "dashboard.scheduler": "Scheduler / Memory Freshness",
  "dashboard.topAlerts": "Top Alerts",
};

const dictionaries: Record<SupportedLocale, Dictionary> = {
  "zh-TW": zhTW,
  en,
  ja: {
    ...en,
    "nav.dashboard": "Dashboard / 投資概要",
    "nav.settings": "Settings / 設定",
    "page.settings": "Settings / 設定",
  },
  ko: {
    ...en,
    "nav.dashboard": "Dashboard / 투자 개요",
    "nav.settings": "Settings / 설정",
    "page.settings": "Settings / 설정",
  },
  "zh-CN": {
    ...zhTW,
    "nav.dashboard": "Dashboard / 投资总览",
    "nav.portfolio": "Portfolio / 资产",
    "nav.settings": "Settings / 设置",
    "page.settings": "Settings / 设置",
  },
};

export function translate(key: string, locale: SupportedLocale = defaultPreferences.locale) {
  return dictionaries[locale]?.[key] || dictionaries.en[key] || dictionaries["zh-TW"][key] || key;
}

export function useI18n() {
  const { preferences } = usePreferences();

  return {
    locale: preferences.locale,
    t(key: string) {
      return translate(key, preferences.locale);
    },
  };
}
