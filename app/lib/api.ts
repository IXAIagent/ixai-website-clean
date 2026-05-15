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
  detail?: string;
  message?: string;
  [key: string]: unknown;
};

type ApiFetchInit = RequestInit & {
  skipAuthRedirect?: boolean;
};

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
  window.localStorage.setItem("ixai_token", token);
  window.localStorage.removeItem("token");
}

export function authHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getToken();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("ixai_token");
  window.localStorage.removeItem("token");
}

function readableError(payload: unknown, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;

  if (typeof payload === "object") {
    const data = payload as ErrorPayload;
    if (typeof data.detail === "string") return data.detail;
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

export function getMySummary() {
  return apiFetch<SummaryResponse>("/api/v1/dashboard/my-summary");
}

export function getMyAssetAllocation() {
  return apiFetch<AssetAllocationResponse>(
    "/api/v1/dashboard/my-asset-allocation",
  );
}

export function getMyRiskOverview() {
  return apiFetch<RiskOverviewResponse>("/api/v1/dashboard/my-risk-overview");
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

export function getPortfolioNews() {
  return apiFetch<PortfolioNewsResponse>("/api/v1/intelligence/news/portfolio");
}

export function getPortfolioPriority() {
  return apiFetch<PortfolioPriorityResponse>("/api/v1/intelligence/priority");
}

export function getPortfolioIntelligence() {
  return apiFetch<PortfolioIntelligenceResponse>("/api/v1/intelligence/portfolio");
}

export function getPortfolioSummaryV2A() {
  return apiFetch<PortfolioSummaryV2AResponse>("/api/v1/intelligence/portfolio-summary");
}

export function getIntelligenceTimeline() {
  return apiFetch<TimelineIntelligenceResponse>("/api/v1/intelligence/timeline");
}

export function getIntelligenceScenarios() {
  return apiFetch<ScenarioResponse>("/api/v1/intelligence/scenarios");
}

export function getIntelligenceGraph() {
  return apiFetch<IntelligenceGraphResponse>("/api/v1/intelligence/graph");
}

export function getIntelligenceReasoning() {
  return apiFetch<ReasoningSystemResponse>("/api/v1/intelligence/reasoning");
}

export function explainCopilot(question: string) {
  return apiFetch<CopilotExplainResponse>("/api/v1/intelligence/copilot/explain", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function updateStock(id: string | number, payload: StockUpdatePayload) {
  return apiFetch<{ status?: string; message?: string; id?: string | number }>(
    `/api/v1/portfolio/stock/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function updateCrypto(id: string | number, payload: CryptoUpdatePayload) {
  return apiFetch<{ status?: string; message?: string; id?: string | number }>(
    `/api/v1/portfolio/crypto/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function updateCash(id: string | number, payload: CashUpdatePayload) {
  return apiFetch<{ status?: string; message?: string; id?: string | number }>(
    `/api/v1/portfolio/cash/${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
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

  return apiFetch<PortfolioCsvImportResponse>("/api/v1/imports/portfolio-csv", {
    method: "POST",
    body: formData,
    signal,
  });
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
