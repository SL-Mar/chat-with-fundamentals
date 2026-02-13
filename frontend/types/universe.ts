export interface Universe {
  id: string;
  name: string;
  source_type: 'sector' | 'etf';
  sector?: string;
  etf_symbol?: string;
  start_date: string;
  end_date: string;
  granularities: string[];
  status: 'creating' | 'ready' | 'refreshing' | 'error';
  total_tickers: number;
  tickers_completed: number;
  error_message?: string;
  created_at?: string;
  db_name?: string;
  tickers?: UniverseTicker[];
}

export interface UniverseTicker {
  ticker: string;
  company_name?: string;
  ohlcv_status: string;
  fundamentals_status: string;
}

export interface CreateUniverseRequest {
  name: string;
  source_type: 'sector' | 'etf';
  sector?: string;
  etf_symbol?: string;
  start_date: string;
  end_date: string;
  granularities: string[];
}

export interface UniverseProgress {
  status: string;
  total_tickers: number;
  tickers_completed: number;
  progress_pct: number;
  error_message?: string;
}
