"use client";

const LOCAL_API_BASE = "http://localhost:8000";

function resolveApiBase() {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredBase) return configuredBase.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production");
  }

  return LOCAL_API_BASE;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
  (process.env.NODE_ENV === "production" ? "" : LOCAL_API_BASE);

type ErrorPayload = {
  detail?: unknown;
  message?: string;
  [key: string]: unknown;
};

type ApiFetchInit = RequestInit & {
  skipAuthRedirect?: boolean;
};

const DATA_CACHE_TTL_MS = 25_000;

type CacheEntry<T = unknown> = {
  value?: T;
  promise?: Promise<T>;
  timestamp: number;
};

const getCache = new Map<string, CacheEntry>();

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterResponse = {
  status?: string;
  message?: string;
  email?: string;
};

export type SummaryResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  total_value?: number | string | null;
  stock_value?: number | string | null;
  fcn_value?: number | string | null;
  crypto_value?: number | string | null;
  cash_value?: number | string | null;
  risk_level?: string | null;
  top_risk?: string | null;
  ai_advice?: string | null;
  stock_positions?: StockPositionResponse[] | null;
  stocks?: StockPositionResponse[] | null;
  fcn_analysis?: FCNPositionResponse[] | null;
  fcn_positions?: FCNPositionResponse[] | null;
  fcn_summary?: FCNPositionResponse[] | null;
  crypto_positions?: CryptoPositionResponse[] | null;
  cash_summary?: CashPositionResponse[] | null;
};

export type AllocationItem = {
  asset_class: string;
  value: number;
  percentage: number;
};

export type AssetAllocationResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  total_value?: number | string | null;
  items?: AllocationItem[] | null;
};

export type DecisionCard = {
  title?: string | null;
  level?: string | null;
  message?: string | null;
  action_label?: string | null;
};

export type AlertItem = {
  id?: string | number | null;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  level?: string | null;
  asset_class?: string | null;
  asset_ref?: string | null;
  status?: string | null;
};

export type RiskOverviewResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  risk_level?: string | null;
  risk_score?: number | string | null;
  top_risk?: string | null;
  decision_cards?: DecisionCard[] | null;
  alerts?: AlertItem[] | null;
  ai_advice?: string | null;
};

export type StockPositionResponse = {
  id?: string | number | null;
  symbol?: string | null;
  display_name?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
  price_source?: string | null;
  is_stale?: boolean | null;
};

export type FCNPositionResponse = {
  id?: string | number | null;
  name?: string | null;
  fcn_code?: string | null;
  code?: string | null;
  issuer?: string | null;
  notional_amount?: number | string | null;
  notional?: number | string | null;
  underlyings?: string | null;
  tenor_months?: number | string | null;
  issue_date?: string | null;
  maturity_date?: string | null;
  days_to_maturity?: number | string | null;
  settlement_currency?: string | null;
  coupon_frequency?: string | null;
  next_observation_date?: string | null;
  next_coupon_date?: string | null;
  observation_dates_json?: string | null;
  coupon_dates_json?: string | null;
  ki_level?: number | string | null;
  ko_level?: number | string | null;
  risk_level?: string | null;
  worst_symbol?: string | null;
  worst_of?: string | null;
  worst_underlying?: string | null;
  worst_performance?: number | string | null;
  distance_to_KI?: number | string | null;
  distance_to_KO?: number | string | null;
  distance_to_ki?: number | string | null;
  distance_to_ko?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  price_source?: string | null;
  is_stale?: boolean | null;
  underlying_results?: FCNUnderlyingResult[] | null;
  prices?: FCNUnderlyingResult[] | null;
};

export type FCNCouponScheduleResponse = {
  id?: string | number | null;
  fcn_position_id?: string | number | null;
  period_index?: number | string | null;
  observation_start_date?: string | null;
  observation_date?: string | null;
  payment_date?: string | null;
  status?: string | null;
};

export type FCNUnderlyingResult = {
  symbol?: string | null;
  initial_price?: number | string | null;
  current_price?: number | string | null;
  performance?: number | string | null;
  distance_to_KI?: number | string | null;
  distance_to_KO?: number | string | null;
  distance_to_ki?: number | string | null;
  distance_to_ko?: number | string | null;
  distance_to_ki_pct?: number | string | null;
  distance_to_ko_pct?: number | string | null;
  price_source?: string | null;
  is_stale?: boolean | null;
};

export type CryptoPositionResponse = {
  id?: string | number | null;
  symbol?: string | null;
  display_name?: string | null;
  asset_type?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  current_value?: number | string | null;
  leverage?: number | string | null;
  grid_lower?: number | string | null;
  grid_upper?: number | string | null;
  price_source?: string | null;
  is_stale?: boolean | null;
};

export type CashPositionResponse = {
  id?: string | number | null;
  currency?: string | null;
  amount?: number | string | null;
};

export type StockUpdatePayload = {
  quantity?: number | null;
  avg_price?: number | null;
  current_price?: number | null;
};

export type CryptoUpdatePayload = StockUpdatePayload & {
  leverage?: number | null;
  grid_lower?: number | null;
  grid_upper?: number | null;
};

export type CashUpdatePayload = {
  amount?: number | null;
};

export type AccountResponse = {
  id?: string | null;
  name?: string | null;
  owner_user_id?: string | null;
  account_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AccountsListResponse = {
  items?: AccountResponse[] | null;
};

export type AccountPortfolioResponse = {
  id?: string | null;
  name?: string | null;
  base_currency?: string | null;
  user_id?: string | null;
  account_id?: string | null;
  created_at?: string | null;
};

export type AccountPortfoliosResponse = {
  items?: AccountPortfolioResponse[] | null;
};

export type AddStockPayload = {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price?: number | null;
};

export type AddCryptoPayload = {
  symbol: string;
  quantity: number;
  avg_price?: number | null;
  current_price?: number | null;
  asset_type?: string;
  leverage?: number | null;
  grid_lower?: number | null;
  grid_upper?: number | null;
};

export type AddCashPayload = {
  currency: string;
  amount: number;
};

export type AddFcnPayload = {
  name?: string | null;
  fcn_code?: string | null;
  issuer?: string | null;
  notional_amount?: number | null;
  underlyings?: string | null;
  underlying_details?: Array<{ symbol: string; initial_price?: number | null; weight?: number | null }> | null;
  worst_of_symbol?: string | null;
  ki_level?: number | null;
  ko_level?: number | null;
  strike_level?: number | null;
  coupon_rate?: number | null;
  tenor_months?: number | null;
  issue_date?: string | null;
  settlement_currency?: string | null;
  coupon_frequency?: string | null;
  observation_dates_json?: string | null;
  coupon_dates_json?: string | null;
  coupon_payment_lag_days?: number | null;
};

export type AssetCandidate = {
  canonical_symbol?: string | null;
  display_name?: string | null;
  asset_type?: string | null;
  market?: string | null;
  currency?: string | null;
  confidence?: number | string | null;
  match_type?: string | null;
  source?: string | null;
};

export type AssetResolveResponse = AssetCandidate & {
  input?: string | null;
  candidates?: AssetCandidate[] | null;
};

export type ImportErrorItem = {
  row?: number | string | null;
  error?: string | null;
};

export type PortfolioCsvImportResponse = {
  status?: string | null;
  imported?: number | string | null;
  updated?: number | string | null;
  skipped?: number | string | null;
  errors?: ImportErrorItem[] | null;
  batch_id?: string | number | null;
};

export type PortfolioCsvPreviewRow = {
  row?: number | string | null;
  asset_type?: string | null;
  input_symbol?: string | null;
  canonical_symbol?: string | null;
  display_name?: string | null;
  action?: "import" | "update" | "skip" | string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  current_price?: number | string | null;
  currency?: string | null;
  amount?: number | string | null;
  errors?: string[] | null;
};

export type PortfolioCsvPreviewResponse = {
  status?: "preview" | string | null;
  rows?: PortfolioCsvPreviewRow[] | null;
  summary?: {
    will_import?: number | string | null;
    will_update?: number | string | null;
    will_skip?: number | string | null;
    errors?: number | string | null;
  } | null;
};

export type ImportHistoryItem = {
  id?: string | number | null;
  import_type?: string | null;
  file_name?: string | null;
  imported?: number | string | null;
  updated?: number | string | null;
  skipped?: number | string | null;
  errors_count?: number | string | null;
  status?: string | null;
  created_at?: string | null;
};

export type ImportAuditRow = {
  row_number?: number | string | null;
  asset_type?: string | null;
  input_symbol?: string | null;
  canonical_symbol?: string | null;
  action?: string | null;
  status?: string | null;
  error_message?: string | null;
};

export type ImportHistoryResponse = {
  items?: ImportHistoryItem[] | null;
};

export type ImportHistoryDetailResponse = ImportHistoryItem & {
  rows?: ImportAuditRow[] | null;
};

export type NewsArticle = {
  symbol?: string | null;
  title?: string | null;
  publisher?: string | null;
  link?: string | null;
  published_at?: string | null;
  related_tickers?: string[] | null;
  source?: string | null;
  relevance_score?: number | string | null;
  relevance_level?: "LOW" | "MEDIUM" | "HIGH" | string | null;
  impact?: "positive" | "negative" | "neutral" | string | null;
  impact_reason?: string | null;
  is_fcn_related?: boolean | null;
  related_fcn_codes?: string[] | null;
  narrative?: string | null;
  portfolio_exposure?: string | null;
  risk_direction?: string | null;
  attention_level?: string | null;
  portfolio_impact_summary?: string | null;
  priority_score?: number | string | null;
  priority_level?: string | null;
  alert_summary?: string | null;
  ai_summary?: string | null;
};

export type PortfolioNewsResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  articles?: NewsArticle[] | null;
  summary?: string | null;
  fetched_at?: string | null;
  is_stale?: boolean | null;
};

export type PortfolioPriorityResponse = {
  top_alerts?: NewsArticle[] | null;
  critical_count?: number | string | null;
  high_count?: number | string | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type IntelligenceScore = {
  impact_score?: number | string | null;
  portfolio_relevance_score?: number | string | null;
  fcn_risk_score?: number | string | null;
  ai_momentum_score?: number | string | null;
  crypto_vol_score?: number | string | null;
  macro_risk_score?: number | string | null;
  total_score?: number | string | null;
};

export type IntelligenceNarrative = {
  market_narrative?: string | null;
  portfolio_narrative?: string | null;
  risk_narrative?: string | null;
  fcn_narrative?: string | null;
  what_changed_today?: string | null;
};

export type IntelligenceCorrelation = {
  source_symbol?: string | null;
  related_symbols?: string[] | null;
  correlation_type?: string | null;
  explanation?: string | null;
  risk_direction?: string | null;
};

export type WorkspaceDecision = {
  workspace_mode?: string | null;
  primary_focus?: string | null;
  risk_drift?: string | null;
  market_regime?: string | null;
  decision_signals?: string[] | null;
};

export type IntelligenceBrief = {
  summary_lines?: string[] | null;
  watch_now?: string[] | null;
  upcoming_focus?: string[] | null;
};

export type PortfolioIntelligenceResponse = {
  scores?: IntelligenceScore | null;
  narrative?: IntelligenceNarrative | null;
  correlations?: IntelligenceCorrelation[] | null;
  workspace?: WorkspaceDecision | null;
  brief?: IntelligenceBrief | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type ScenarioResult = {
  scenario_name?: string | null;
  impact_level?: string | null;
  affected_assets?: string[] | null;
  portfolio_sensitivity?: string | null;
  fcn_risk_change?: string | null;
  narrative?: string | null;
};

export type ScenarioResponse = {
  scenarios?: ScenarioResult[] | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type IntelligenceGraphNode = {
  id?: string | null;
  label?: string | null;
  node_type?: string | null;
  weight?: number | string | null;
};

export type IntelligenceGraphEdge = {
  source?: string | null;
  target?: string | null;
  edge_type?: string | null;
  explanation?: string | null;
};

export type IntelligenceGraphResponse = {
  nodes?: IntelligenceGraphNode[] | null;
  edges?: IntelligenceGraphEdge[] | null;
  strongest_themes?: string[] | null;
  strongest_connections?: string[] | null;
  top_correlated_risks?: string[] | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type CopilotExplainResponse = {
  answer?: string | null;
  supported_topics?: string[] | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type LongMemorySummary = {
  dominant_workspace_mode?: string | null;
  recurring_risk_themes?: string[] | null;
  historical_risk_trend?: string | null;
  fcn_risk_trend?: string | null;
  crypto_vol_trend?: string | null;
  ai_momentum_trend?: string | null;
  concentration_trend?: string | null;
};

export type ThemeEvolution = {
  dominant_themes?: string[] | null;
  emerging_themes?: string[] | null;
  weakening_themes?: string[] | null;
  theme_confidence?: number | string | null;
  narrative_summary?: string | null;
};

export type ReasoningResult = {
  top_risks?: string[] | null;
  top_strengths?: string[] | null;
  key_dependencies?: string[] | null;
  concentration_analysis?: string | null;
  volatility_analysis?: string | null;
  reasoning_summary?: string | null;
  why_workspace_mode?: string | null;
  what_changed_this_week?: string | null;
};

export type PredictiveDrift = {
  likely_workspace_shift?: string | null;
  confidence?: number | string | null;
  prediction_reason?: string | null;
  predictive_alerts?: string[] | null;
};

export type TimelineSummary = {
  what_changed_today?: string | null;
  what_changed_this_week?: string | null;
  new_risks?: string[] | null;
  improving_signals?: string[] | null;
  persistent_themes?: string[] | null;
  timeline_events?: string[] | null;
};

export type PortfolioDNA = {
  dominant_style?: string | null;
  risk_profile?: string | null;
  volatility_profile?: string | null;
  concentration_profile?: string | null;
  AI_exposure_level?: string | null;
  FCN_dependency_level?: string | null;
  crypto_dependency_level?: string | null;
  macro_sensitivity?: string | null;
};

export type ReasoningSystemResponse = {
  long_memory?: LongMemorySummary | null;
  themes?: ThemeEvolution | null;
  reasoning?: ReasoningResult | null;
  predictive?: PredictiveDrift | null;
  timeline?: TimelineSummary | null;
  dna?: PortfolioDNA | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type ExplainabilitySummary = {
  why_risk_increased?: string | null;
  what_changed_today?: string | null;
  dominant_driver?: string | null;
  hidden_correlation?: string | null;
  systemic_risk?: string | null;
};

export type PortfolioSummaryV2AResponse = {
  regime?: string | null;
  dominant_risk?: string | null;
  concentration_score?: number | string | null;
  drift_summary?: string | null;
  explainability?: ExplainabilitySummary | null;
  top_alerts?: string[] | null;
  intelligence_confidence?: number | string | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type TimelineWindowResponse = {
  window?: string | null;
  regime_evolution?: string | null;
  exposure_evolution?: string | null;
  risk_score_trend?: string | null;
  concentration_trend?: string | null;
  volatility_trend?: string | null;
  dominant_driver_history?: string[] | null;
  recurring_risks?: string[] | null;
  improving_signals?: string[] | null;
  deteriorating_signals?: string[] | null;
};

export type TimelineIntelligenceResponse = {
  portfolio_id?: string | null;
  windows?: TimelineWindowResponse[] | null;
  regime_evolution?: string | null;
  exposure_evolution?: string | null;
  risk_score_trend?: string | null;
  concentration_trend?: string | null;
  volatility_trend?: string | null;
  dominant_driver_history?: string[] | null;
  recurring_risks?: string[] | null;
  improving_signals?: string[] | null;
  deteriorating_signals?: string[] | null;
  timeline_summary?: string | null;
  message?: string | null;
  confidence?: number | string | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
};

export type BackendHealthResponse = {
  status?: string | null;
  ok?: boolean | null;
  service?: string | null;
  database?: string | null;
  timestamp?: string | null;
  [key: string]: unknown;
};

// v4A: Portfolio engine summary types
export type ExposureGraphNodeV4 = {
  label?: string | null;
  node_type?: string | null;
  weight?: number | null;
};
export type ExposureGraphEdgeV4 = {
  source?: string | null;
  target?: string | null;
  edge_type?: string | null;
  weight?: number | null;
};
export type ExposureGraphSummaryV4 = {
  nodes?: ExposureGraphNodeV4[] | null;
  edges?: ExposureGraphEdgeV4[] | null;
  repeated_underlyings?: string[] | null;
  dominant_themes?: string[] | null;
  high_beta_symbols?: string[] | null;
  fcn_linked_symbols?: string[] | null;
};
export type ConcentrationSummaryV4 = {
  single_name_pct?: number | null;
  theme_pct?: number | null;
  fcn_underlying_pct?: number | null;
  crypto_pct?: number | null;
  cash_buffer_pct?: number | null;
  concentration_score?: number | null;
  risk_level?: string | null;
  top_concentration_label?: string | null;
};
export type PortfolioDriftSummaryV4 = {
  allocation_drift?: string | null;
  concentration_drift?: string | null;
  volatility_drift?: string | null;
  fcn_pressure_drift?: string | null;
  regime_drift?: string | null;
  drift_summary?: string | null;
  history_window?: number | null;
};
export type FCNSystemicRiskSummaryV4 = {
  worst_of_pressure_pct?: number | null;
  nearest_ki_pct?: number | null;
  repeated_underlyings?: string[] | null;
  ki_cluster_symbols?: string[] | null;
  observation_clustering?: string | null;
  risk_level?: string | null;
};
export type RiskPropagationChainV4 = {
  chain?: string[] | null;
  explanation?: string | null;
};
export type RiskPropagationSummaryV4 = {
  chains?: RiskPropagationChainV4[] | null;
  summary?: string | null;
};
export type UnifiedIntelligenceScoreV4 = {
  exposure_score?: number | null;
  concentration_score?: number | null;
  fcn_stress_score?: number | null;
  volatility_score?: number | null;
  drift_score?: number | null;
  systemic_score?: number | null;
  total_intelligence_score?: number | null;
  risk_state?: string | null;
  confidence?: number | null;
};
export type PortfolioEngineSummaryResponse = {
  portfolio_id?: string | null;
  exposure_graph?: ExposureGraphSummaryV4 | null;
  concentration?: ConcentrationSummaryV4 | null;
  drift?: PortfolioDriftSummaryV4 | null;
  fcn_systemic_risk?: FCNSystemicRiskSummaryV4 | null;
  risk_propagation?: RiskPropagationSummaryV4 | null;
  unified_score?: UnifiedIntelligenceScoreV4 | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
  // v4E additions
  status?: string | null;
  stale_reason?: string | null;
  degraded_reason?: string | null;
  locale?: string | null;
  failed_engines?: string[] | null;
};

// v4B: Market engine summary types
export type MarketRegimeSummaryV4 = {
  regime?: string | null;
  confidence?: number | null;
  drivers?: string[] | null;
  narrative?: string | null;
};
export type VolatilityStateSummaryV4 = {
  equity_volatility_state?: string | null;
  crypto_volatility_state?: string | null;
  fcn_sensitivity_state?: string | null;
  overall_state?: string | null;
  data_limited?: boolean | null;
};
export type MacroNewsRiskThemeV4 = {
  theme?: string | null;
  weight?: number | null;
  sample_headlines?: string[] | null;
};
export type MacroNewsRiskSummaryV4 = {
  rates_pressure?: number | null;
  ai_pressure?: number | null;
  crypto_pressure?: number | null;
  geopolitics_pressure?: number | null;
  earnings_pressure?: number | null;
  macro_stress?: number | null;
  top_themes?: MacroNewsRiskThemeV4[] | null;
  narrative?: string | null;
};
export type PortfolioMarketImpactSummaryV4 = {
  fcn_impact?: string | null;
  crypto_impact?: string | null;
  equity_impact?: string | null;
  cash_buffer_interpretation?: string | null;
  overall_impact_level?: string | null;
};
export type MarketEngineSummaryResponse = {
  portfolio_id?: string | null;
  regime?: MarketRegimeSummaryV4 | null;
  volatility?: VolatilityStateSummaryV4 | null;
  macro_news?: MacroNewsRiskSummaryV4 | null;
  portfolio_impact?: PortfolioMarketImpactSummaryV4 | null;
  generated_at?: string | null;
  is_stale?: boolean | null;
  // v4E additions
  status?: string | null;
  stale_reason?: string | null;
  degraded_reason?: string | null;
  locale?: string | null;
  failed_engines?: string[] | null;
};

// v3D: shape of GET/PUT /api/v1/preferences. Backend uses snake_case.
export type UserPreferencesPayload = {
  locale?: string | null;
  default_landing_page?: string | null;
  compact_mode?: boolean | null;
  terminal_mode?: boolean | null;
  show_advanced_intelligence?: boolean | null;
  alert_mode?: string | null;
  notification_telegram?: boolean | null;
  notification_email?: boolean | null;
  risk_interpretation_mode?: string | null;
  active_account_id?: string | null;
  active_portfolio_id?: string | null;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ixai_token");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  clearApiCache();
  window.localStorage.setItem("ixai_token", token);
  window.localStorage.removeItem("token");
}

// v4D: attach the user's preferred locale to outbound API requests so the
// backend can apply locale-aware narrative. Reads from the same localStorage
// key that `usePreferences` writes. Safe on SSR (returns empty).
function getStoredLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ixai_preferences_v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.locale === "string") return parsed.locale;
  } catch {
    // ignore
  }
  return null;
}

export function authHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getToken();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  const locale = getStoredLocale();
  if (locale && !nextHeaders.has("X-IXAI-Locale")) {
    nextHeaders.set("X-IXAI-Locale", locale);
  }

  return nextHeaders;
}

export function logout() {
  if (typeof window === "undefined") return;
  clearApiCache();
  window.localStorage.removeItem("ixai_token");
  window.localStorage.removeItem("token");
}

export function clearApiCache() {
  getCache.clear();
}

function readableError(payload: unknown, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;

  if (typeof payload === "object") {
    const data = payload as ErrorPayload;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const record = item as { loc?: unknown; msg?: unknown };
          const path = Array.isArray(record.loc) ? record.loc.slice(1).join(".") : "";
          const message = typeof record.msg === "string" ? record.msg : "";
          return [path, message].filter(Boolean).join(": ");
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
    if (typeof data.message === "string") return data.message;
  }

  return fallback;
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { skipAuthRedirect, ...fetchInit } = init;
  const headers = authHeaders(fetchInit.headers);
  const isFormData =
    typeof FormData !== "undefined" && fetchInit.body instanceof FormData;

  if (fetchInit.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const apiBase = resolveApiBase();
  const res = await fetch(path.startsWith("http") ? path : `${apiBase}${path}`, {
    ...fetchInit,
    headers,
  });
  const payload = await parseResponse(res);

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
      logout();
      window.location.href = "/login";
    }

    throw new ApiError(
      readableError(payload, `API request failed (${res.status})`),
      res.status,
      payload,
    );
  }

  return payload as T;
}

function cacheKey(path: string) {
  return JSON.stringify({
    path,
    token: getToken() || "",
    locale: getStoredLocale() || "",
  });
}

function cachedGet<T>(
  path: string,
  ttlMs = DATA_CACHE_TTL_MS,
  init: ApiFetchInit = {},
): Promise<T> {
  if (typeof window === "undefined") return apiFetch<T>(path, init);
  const key = cacheKey(path);
  const now = Date.now();
  const entry = getCache.get(key) as CacheEntry<T> | undefined;

  if (entry?.promise) return entry.promise;
  if (entry && entry.value !== undefined && now - entry.timestamp < ttlMs) {
    return Promise.resolve(entry.value);
  }

  const promise = apiFetch<T>(path, init)
    .then((value) => {
      getCache.set(key, { value, timestamp: Date.now() });
      return value;
    })
    .catch((error) => {
      getCache.delete(key);
      throw error;
    });

  getCache.set(key, { promise, timestamp: now });
  return promise;
}

function invalidateAfter<T>(promise: Promise<T>): Promise<T> {
  return promise.then((value) => {
    clearApiCache();
    return value;
  });
}

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/api/v1/auth/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
  setToken(data.access_token);
  return data;
}

export function register(email: string, password: string) {
  return apiFetch<RegisterResponse>("/api/v1/auth/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
}

// v3C: helper to append optional ?portfolio_id= query string for scoped endpoints.
function withPortfolioId(path: string, portfolioId?: string | null) {
  if (!portfolioId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}portfolio_id=${encodeURIComponent(portfolioId)}`;
}

export function getMySummary() {
  return cachedGet<SummaryResponse>("/api/v1/dashboard/my-summary");
}

export function getMyAssetAllocation() {
  return cachedGet<AssetAllocationResponse>(
    "/api/v1/dashboard/my-asset-allocation",
  );
}

export function getMyRiskOverview() {
  return cachedGet<RiskOverviewResponse>("/api/v1/dashboard/my-risk-overview");
}

// v3C: scoped variants honour AppShell's selectedPortfolioId.
// Backend falls back to the user's first portfolio when portfolioId is empty.
export function getDashboardSummary(portfolioId?: string | null) {
  return cachedGet<SummaryResponse>(withPortfolioId("/api/v1/dashboard/summary", portfolioId));
}

export function getDashboardAlerts(portfolioId?: string | null) {
  return cachedGet<AlertItem[]>(withPortfolioId("/api/v1/dashboard/alerts", portfolioId));
}

// v4A / v4B engine helpers
export function getPortfolioEngineSummary(portfolioId?: string | null) {
  return cachedGet<PortfolioEngineSummaryResponse>(
    withPortfolioId("/api/v1/intelligence/engine-summary", portfolioId),
  );
}

export function getMarketEngineSummary(portfolioId?: string | null) {
  return cachedGet<MarketEngineSummaryResponse>(
    withPortfolioId("/api/v1/intelligence/market-engine", portfolioId),
  );
}

// v3D: per-user preferences sync. skipAuthRedirect so a logged-out hook caller
// (e.g. usePreferences mounted on /login) silently falls back to localStorage
// instead of triggering a redirect loop.
export function getUserPreferences() {
  return cachedGet<UserPreferencesPayload>("/api/v1/preferences", DATA_CACHE_TTL_MS, {
    skipAuthRedirect: true,
  });
}

function putUserPreferencesRaw(payload: UserPreferencesPayload) {
  return apiFetch<UserPreferencesPayload>("/api/v1/preferences", {
    skipAuthRedirect: true,
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function putUserPreferences(payload: UserPreferencesPayload) {
  return invalidateAfter(putUserPreferencesRaw(payload));
}

export function getBackendHealth() {
  return apiFetch<BackendHealthResponse>("/health", { skipAuthRedirect: true });
}

export function getAccounts() {
  return cachedGet<AccountsListResponse>("/api/v1/accounts");
}

export function getAccount(accountId: string) {
  return apiFetch<AccountResponse>(`/api/v1/accounts/${encodeURIComponent(accountId)}`);
}

export function createAccount(name: string, accountType = "individual") {
  return invalidateAfter(apiFetch<AccountResponse>("/api/v1/accounts", {
    method: "POST",
    body: JSON.stringify({ name, account_type: accountType }),
  }));
}

export function getAccountPortfolios(accountId: string) {
  return cachedGet<AccountPortfoliosResponse>(
    `/api/v1/accounts/${encodeURIComponent(accountId)}/portfolios`,
  );
}

export function createAccountPortfolio(accountId: string, name: string, baseCurrency = "USD") {
  return invalidateAfter(apiFetch<AccountPortfolioResponse>(
    `/api/v1/accounts/${encodeURIComponent(accountId)}/portfolios`,
    {
      method: "POST",
      body: JSON.stringify({ name, base_currency: baseCurrency }),
    },
  ));
}

export function getAccountIntelligenceSummary(accountId: string) {
  return apiFetch<PortfolioSummaryV2AResponse>(
    `/api/v1/accounts/${encodeURIComponent(accountId)}/intelligence/summary`,
  );
}

export function getStocks() {
  return apiFetch<StockPositionResponse[]>("/api/v1/portfolio/stocks");
}

export function getFcns() {
  return apiFetch<FCNPositionResponse[]>("/api/v1/portfolio/fcns");
}

export function getCrypto() {
  return apiFetch<CryptoPositionResponse[]>("/api/v1/portfolio/crypto");
}

export function getCash() {
  return apiFetch<CashPositionResponse[]>("/api/v1/portfolio/cash");
}

export function addStock(payload: AddStockPayload) {
  return invalidateAfter(apiFetch<{ status?: string; id?: string | number }>("/api/v1/portfolio/stock", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export function addCrypto(payload: AddCryptoPayload) {
  return invalidateAfter(apiFetch<{ status?: string; id?: string | number }>("/api/v1/portfolio/crypto", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export function addCash(payload: AddCashPayload) {
  return invalidateAfter(apiFetch<{ status?: string; id?: string | number }>("/api/v1/portfolio/cash", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export function addFcn(payload: AddFcnPayload) {
  return invalidateAfter(apiFetch<{ status?: string; id?: string | number }>("/api/v1/portfolio/fcn", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export function deleteStock(id: string | number) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string }>(
    `/api/v1/portfolio/stocks/${encodeURIComponent(String(id))}`,
    { method: "DELETE" },
  ));
}

export function deleteCrypto(id: string | number) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string }>(
    `/api/v1/portfolio/crypto/${encodeURIComponent(String(id))}`,
    { method: "DELETE" },
  ));
}

export function deleteCash(id: string | number) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string }>(
    `/api/v1/portfolio/cash/${encodeURIComponent(String(id))}`,
    { method: "DELETE" },
  ));
}

export function deleteFcn(id: string | number) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string }>(
    `/api/v1/portfolio/fcn/${encodeURIComponent(String(id))}`,
    { method: "DELETE" },
  ));
}

export function getFcnSchedule(id: string | number) {
  return apiFetch<FCNCouponScheduleResponse[]>(
    `/api/v1/portfolio/fcn/${encodeURIComponent(String(id))}/schedule`,
  );
}

export function getPortfolioNews(portfolioId?: string | null) {
  return cachedGet<PortfolioNewsResponse>(
    withPortfolioId("/api/v1/intelligence/news/portfolio", portfolioId),
  );
}

export function getPortfolioPriority(portfolioId?: string | null) {
  return cachedGet<PortfolioPriorityResponse>(
    withPortfolioId("/api/v1/intelligence/priority", portfolioId),
  );
}

export function getPortfolioIntelligence(portfolioId?: string | null) {
  return cachedGet<PortfolioIntelligenceResponse>(
    withPortfolioId("/api/v1/intelligence/portfolio", portfolioId),
  );
}

export function getPortfolioSummaryV2A(portfolioId?: string | null) {
  return cachedGet<PortfolioSummaryV2AResponse>(
    withPortfolioId("/api/v1/intelligence/portfolio-summary", portfolioId),
  );
}

export function getIntelligenceTimeline(portfolioId?: string | null) {
  return cachedGet<TimelineIntelligenceResponse>(
    withPortfolioId("/api/v1/intelligence/timeline", portfolioId),
  );
}

export function getIntelligenceScenarios(portfolioId?: string | null) {
  return cachedGet<ScenarioResponse>(
    withPortfolioId("/api/v1/intelligence/scenarios", portfolioId),
  );
}

export function getIntelligenceGraph(portfolioId?: string | null) {
  return cachedGet<IntelligenceGraphResponse>(
    withPortfolioId("/api/v1/intelligence/graph", portfolioId),
  );
}

export function getIntelligenceReasoning(portfolioId?: string | null) {
  return cachedGet<ReasoningSystemResponse>(
    withPortfolioId("/api/v1/intelligence/reasoning", portfolioId),
  );
}

export function explainCopilot(
  question: string,
  portfolioId?: string | null,
  queryType?: string | null,
) {
  return apiFetch<CopilotExplainResponse>(
    withPortfolioId("/api/v1/intelligence/copilot/explain", portfolioId),
    {
      method: "POST",
      body: JSON.stringify({
        question: question || "",
        query_type: queryType || null,
      }),
    },
  );
}

export function updateStock(id: string | number, payload: StockUpdatePayload) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string; id?: string | number }>(
    `/api/v1/portfolio/stock/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  ));
}

export function updateCrypto(id: string | number, payload: CryptoUpdatePayload) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string; id?: string | number }>(
    `/api/v1/portfolio/crypto/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  ));
}

export function updateCash(id: string | number, payload: CashUpdatePayload) {
  return invalidateAfter(apiFetch<{ status?: string; message?: string; id?: string | number }>(
    `/api/v1/portfolio/cash/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  ));
}

export function searchAssets(query: string, assetType = "stock") {
  const params = new URLSearchParams({
    query,
    asset_type: assetType,
  });
  return apiFetch<AssetCandidate[]>(`/api/v1/assets/search?${params.toString()}`);
}

export function resolveAsset(query: string, assetType = "stock") {
  const params = new URLSearchParams({
    query,
    asset_type: assetType,
  });
  return apiFetch<AssetResolveResponse>(
    `/api/v1/assets/resolve?${params.toString()}`,
  );
}

export function uploadPortfolioCsv(file: File, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append("file", file);

  return invalidateAfter(apiFetch<PortfolioCsvImportResponse>("/api/v1/imports/portfolio-csv", {
    method: "POST",
    body: formData,
    signal,
  }));
}

export function previewPortfolioCsv(file: File, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<PortfolioCsvPreviewResponse>(
    "/api/v1/imports/portfolio-csv/preview",
    {
      method: "POST",
      body: formData,
      signal,
    },
  );
}

export function getImportHistory() {
  return apiFetch<ImportHistoryResponse>("/api/v1/imports/history");
}

export function getImportHistoryDetail(batchId: string | number) {
  return apiFetch<ImportHistoryDetailResponse>(
    `/api/v1/imports/history/${encodeURIComponent(String(batchId))}`,
  );
}
