// === General User Query ===
export interface UserQuery {
  user_query: string;
}

// === EOD / Quote Data ===
export interface OLHCV {
  date: string
  open: number
  low: number
  high: number
  close: number
  adjusted_close: number
  volume: number
}

export interface EODResult {
  ticker: string
  data: OLHCV[]
}

export interface DataSet_EOD {
  DataSet: EODResult[]
}

// === News Data ===
export interface Fin_News {
  ticker: string
  Date: string
  Title: string
  Content: string
  Link: string
}

export interface Set_News {
  Ticker: string
  News: Fin_News[]
  Present: string
}

export interface DataSet_News {
  DataSet: Set_News[]
}

// === Financial Metrics ===
export interface Fin_Metric {
  Ticker: string
  Metric: string
  Value: string
}

export interface Set_Metrics {
  Ticker: string
  Metrics: Fin_Metric[]
  State: string
}

export interface DataSet_Metrics {
  DataSet: Set_Metrics[]
}

// === Final Consolidated Output (Fundamentals Main Result) ===
export interface Executive_Summary {
  Tickers: string[]
  Ex_summary: string
  Metrics: DataSet_Metrics
  News: DataSet_News
  Quote: DataSet_EOD
}

// === Real-Time / ComboChart Usage ===
export interface Candle {
  datetime: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IntradayDataResponse {
  ticker: string
  interval: string
  candles: Candle[]
}
