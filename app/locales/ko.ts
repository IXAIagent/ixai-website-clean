// v4D: Korean locale. Cascade from English for keys not translated.

import en from "./en";
import type { Dictionary } from "./types";

const ko: Dictionary = {
  ...en,
  common: {
    ...en.common,
    loading: "로딩 중",
    error: "오류",
    fresh: "최신",
    stale: "오래됨",
    monitoringOnly: "관찰 전용 — 거래 지시 아님",
  },
  status: {
    ...en.status,
    healthy: "정상",
    partial: "부분 저하",
    degraded: "저하",
    unavailable: "사용 불가",
    clear: "안정",
    watch: "주시",
    elevated: "상승",
    critical: "심각",
  },
  nav: {
    ...en.nav,
    dashboard: "대시보드",
    portfolio: "포트폴리오",
    intelligence: "인텔리전스",
    market: "마켓",
    alerts: "알림",
    settings: "설정",
  },
  page: {
    ...en.page,
    dashboard: "대시보드",
    portfolio: "포트폴리오 관리",
    intelligence: "인텔리전스",
    market: "마켓",
    alerts: "알림 센터",
    settings: "설정",
  },
  dashboard: {
    ...en.dashboard,
    title: "대시보드",
    todayFocus: "오늘의 포커스",
  },
  intelligence: {
    ...en.intelligence,
    title: "Intelligence",
    portfolioEngine: "포트폴리오 엔진",
    marketEngine: "마켓 엔진",
  },
  market: {
    ...en.market,
    title: "마켓",
    regime: "시장 레짐",
    volatility: "변동성",
  },
};

export default ko;
