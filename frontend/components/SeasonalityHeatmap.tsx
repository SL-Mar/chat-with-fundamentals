"use client";

import type { SeasonalityResponse } from "../types/equity";

const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dowLabels   = ["Mon","Tue","Wed","Thu","Fri"];

function colorClass(v:number){
  if(isNaN(v))            return "bg-slate-600";
  if(v >  0.01)           return "bg-lime-500";
  if(v >  0)              return "bg-lime-600/60";
  if(v > -0.01)           return "bg-red-600/60";
  return "bg-red-500";
}

export default function SeasonalityHeatmap({ data, ticker }:{
  data: SeasonalityResponse; ticker: string;
}){
  const pct = (v:number)=> isNaN(v) ? "n/a" : (v*100).toFixed(1)+"%";

  return (
    <div className="bg-gray-900 border border-slate-700 rounded p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">
        {ticker} • Seasonality (avg return, last {data.years} y)
      </h4>

      {/* month-of-year grid */}
      <div className="grid grid-cols-12 gap-0.5 mb-3 text-[10px]">
        {data.month_mean.map((m,i)=>(
          <div key={i} className={`${colorClass(m)} py-1 text-center`}>
            {monthLabels[i]} <br/>{pct(m)}
          </div>
        ))}
      </div>

      {/* day-of-week strip */}
      <div className="flex gap-0.5 text-[10px]">
        {data.dow_mean.map((d,i)=>(
          <div key={i} className={`flex-1 text-center py-1 ${colorClass(d)}`}>
            {dowLabels[i]} {pct(d)}
          </div>
        ))}
      </div>
    </div>
  );
}
