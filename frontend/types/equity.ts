// types/equity.ts – shared types for /equity endpoints

/* ───────────── Monte‑Carlo simulation ───────────── */
export interface EquityPoint {
  date: string;  // YYYY‑MM‑DD
  close: number; // daily close
}

export interface MonteCarlo {
  paths: number[][]; // [path][day]
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

/* ───────────── Returns histogram & beta scatter ───────────── */
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
    x: number[];    // benchmark returns
    y: number[];    // ticker returns
    beta:  number;
    alpha: number;
    r2:    number;
  };
}

/* ─ cumulative return ─ */
export interface CumRetPoint {
  date: string
  tic:  number
  bmk:  number
}

export interface EquityCumRetResponse {
  ticker:    string
  benchmark: string
  years:     number
  cumret:    CumRetPoint[]
}
