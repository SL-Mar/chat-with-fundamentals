interface Props {
  data?: { ticker: string; factor: string; score: number }[];
}

export default function FactorHeatmap({ data }: Props) {
  if (!data?.length) {
    return <p className="text-sm text-gray-500">No factor data available. Use the Chat tab to generate factors.</p>;
  }

  const tickers = [...new Set(data.map((d) => d.ticker))];
  const factors = [...new Set(data.map((d) => d.factor))];

  const getColor = (score: number) => {
    if (score > 1.5) return 'bg-green-600';
    if (score > 0.5) return 'bg-green-800';
    if (score > -0.5) return 'bg-gray-700';
    if (score > -1.5) return 'bg-red-800';
    return 'bg-red-600';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-gray-400 p-2">Ticker</th>
            {factors.map((f) => (
              <th key={f} className="text-center text-gray-400 p-2">{f}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.slice(0, 30).map((ticker) => (
            <tr key={ticker}>
              <td className="text-white p-2 font-mono">{ticker}</td>
              {factors.map((factor) => {
                const d = data.find((x) => x.ticker === ticker && x.factor === factor);
                const score = d?.score ?? 0;
                return (
                  <td key={factor} className={`text-center p-2 ${getColor(score)}`}>
                    {score.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
