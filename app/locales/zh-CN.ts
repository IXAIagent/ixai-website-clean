// v4D: Simplified Chinese. Cascade from zh-TW (closest dictionary) with
// minimal targeted overrides.

import type { Dictionary } from "./types";
import zhTW from "./zh-TW";

const zhCN: Dictionary = {
  ...zhTW,
  common: {
    ...zhTW.common,
    loading: "加载中",
    error: "错误",
    fresh: "最新",
    stale: "过期",
    monitoringOnly: "仅供观察，非交易指令",
  },
  status: {
    ...zhTW.status,
    partial: "部分降级",
    degraded: "降级",
    unavailable: "暂不可用",
    watch: "观察",
    elevated: "升高",
    critical: "严重",
  },
  dashboard: {
    ...zhTW.dashboard,
    title: "投资总览",
    aiOverview: "今日总结",
    assetAllocation: "资产配置",
    criticalFCN: "FCN 重点监控",
    todayFocus: "今日重点",
  },
  intelligence: {
    ...zhTW.intelligence,
    title: "AI 分析",
    portfolioEngine: "投资组合引擎",
    marketEngine: "市场引擎",
  },
  market: {
    ...zhTW.market,
    title: "市场",
    regime: "市场状态",
    volatility: "波动度",
  },
};

export default zhCN;
