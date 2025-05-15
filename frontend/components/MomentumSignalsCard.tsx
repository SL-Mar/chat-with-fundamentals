"use client";

import type { MomentumResponse } from "../types/equity";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendUp, faArrowTrendDown } from "@fortawesome/free-solid-svg-icons";

export default function MomentumSignalsCard({ data, ticker }:{
  data: MomentumResponse;
  ticker: string;
}){
  const pct = (v:number)=> (v*100).toFixed(2)+"%";

  const crossIcon = data.sma.crossover==="golden"
    ? <FontAwesomeIcon icon={faArrowTrendUp} size="sm" className="text-lime-400 ml-1"/>
    : data.sma.crossover==="death"
      ? <FontAwesomeIcon icon={faArrowTrendDown} size="sm" className="text-red-400 ml-1"/>
      : null;

  const rsiColour =
    data.rsi14>70 ? "text-orange-400"
    : data.rsi14<30 ? "text-orange-400"
    : "text-lime-400";

  const macdBarWidth = Math.min(Math.abs(data.macd.hist)*40, 40); // max 40 px
  const macdBarColor = data.macd.hist>=0 ? "bg-lime-400" : "bg-red-400";

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200 flex items-center">
        {ticker} • Momentum &amp; Trend {crossIcon}
      </h4>

      <div className="grid grid-cols-2 gap-y-1 text-sm text-slate-200">
        <span>SMA&nbsp;50:&nbsp;{data.sma["50"].toFixed(2)}</span>
        <span>SMA&nbsp;200:&nbsp;{data.sma["200"].toFixed(2)}</span>

        <span>EMA&nbsp;21 slope:&nbsp;{pct(data.ema_slope["21"])}</span>
        <span>EMA&nbsp;55 slope:&nbsp;{pct(data.ema_slope["55"])}</span>

        <span className={rsiColour}>RSI-14:&nbsp;{data.rsi14.toFixed(1)}</span>
        <span className="flex items-center">
          MACD&nbsp;hist:
          <span className={`ml-1 h-2 ${macdBarColor}`} style={{width: macdBarWidth}}/>
        </span>
      </div>
    </div>
  );
}
