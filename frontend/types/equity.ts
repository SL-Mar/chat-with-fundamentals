// types/equity.ts  –  shared response shapes for /equity/* endpoints
// ------------------------------------------------------------------

/* ──────────────── Generic helpers ──────────────── */
export interface EquityPoint {
  date:  string;  // YYYY-MM-DD
  close: number;  // adjusted close
}

/* ───────────── Monte-Carlo simulation ───────────── */
export interface MonteCarlo {
  paths:        number[][]; // [path][day]
  percentiles: {
    p5:  number[];
    p50: number[];
    p95: number[];
  };
}

export interface EquitySimulationResponse {
  ticker:       string;
  var_95:       number;
  equity_curve: EquityPoint[];
  monte_carlo:  MonteCarlo;
}

/* ───────────── Returns histogram & β scatter ───────────── */
export interface ReturnsResponse {
  ticker:    string;
  benchmark: string;
  years:     number;
  returns: {
    list: number[];  // daily returns for histogram
    mean: number;
    std:  number;
  };
  scatter: {
    x:     number[]; // benchmark returns
    y:     number[]; // ticker returns
    beta:  number;
    alpha: number;
    r2:    number;
  };
}

/* ───────────── Cumulative return curve ───────────── */
export interface CumRetPoint {
  date: string;
  tic:  number;
  bmk:  number;
}

export interface EquityCumRetResponse {
  ticker:    string;
  benchmark: string;
  years:     number;
  cumret:    CumRetPoint[];
}

/* ───────────── Volatility forecast snapshot ───────────── */
export interface VolForecastResponse {
  ticker:      string;
  sigma_t1:    number;    // next-day EWMA vol
  ewma_vol:    number[];  // full series for spark-line
  evt_cvar_99: number;    // empirical CVaR(99 %)
}

/* ───────────── Performance ratios snapshot ───────────── */
export interface PerfRatiosResponse {
  ticker:   string;
  years:    number;
  sharpe:   number;
  sortino:  number;
  max_dd:   number;  // negative value, e.g. -0.23 for -23 %
  calmar:   number;
}

/* ───────── Dispersion & Risk snapshot ───────── */
export interface RiskMetricsResponse {
  ticker:      string;
  lookback:    number;
  rolling_sigma: {
    "30d": number;
    "60d": number;
    "90d": number;
  };
  range_vol: {
    parkinson:    number;
    garman_klass: number;
  };
  hist_var:  { p95: number; p99: number };
  hist_cvar: { p95: number; p99: number };
  max_dd:     number;
  avg_dd_len: number; // trading-day count
}

/* ───────────── Momentum & Trend ───────────── */
export interface MomentumResponse {
  ticker: string;
  sma: {
    "50":  number;
    "200": number;
    crossover: "golden" | "death" | "none";
  };
  ema_slope: { "21": number; "55": number };
  rsi14:  number;
  macd:   { macd: number; signal: number; hist: number };
}

/* ───────────── Seasonality ───────────── */
export interface SeasonalityResponse {
  ticker:      string;
  years:       number;
  month_mean:  number[]; // length 12, Jan..Dec
  dow_mean:    number[]; // length 5, Mon..Fri
}
/* ───────────── Rolling β snapshot ───────────── */
export interface RollingBetaResponse {
  ticker:     string;
  benchmark:  string;
  window:     number;
  dates:      string[]; // ISO yyyy-mm-dd, length N
  beta:       number[]; // length N
  alpha:      number[]; // length N
  r2:         number[]; // length N
  info_ratio: number;
}
/* ───────── Liquidity snapshot ───────── */
export interface LiquidityResponse {
  ticker: string;
  avg_turnover_30d: number;
  avg_turnover_60d: number;
  turnover_trend_pct: number;
  obv: number[];         // 0-1 normalised spark-line
  volume_rsi: number;    // 0-1
  mfi14: number;         // 0-100
}
/* ───────── Volatility structure ───────── */
export interface VolBandResponse {
  ticker: string;
  atr_pct:   number[]; // length N, %
  kelt_pct:  number[]; // width %, 20-ema ± 2*ATR
  donch_pct: number[]; // width %, 20-day channel
}
