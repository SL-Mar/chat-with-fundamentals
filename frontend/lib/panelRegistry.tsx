// lib/panelRegistry.tsx
// Component registry for dynamic panel rendering

import DividendHistory from '../components/DividendHistory';
import IntradayChart from '../components/IntradayChart';
import AnalystRatings from '../components/AnalystRatings';
import InsiderTransactions from '../components/InsiderTransactions';

export const PANEL_REGISTRY: Record<string, React.ComponentType<any>> = {
  'show_dividend_history': DividendHistory,
  'show_price_chart': IntradayChart,
  'show_analyst_ratings': AnalystRatings,
  'show_insider_transactions': InsiderTransactions,
};

export function renderPanel(panelType: string, props: any) {
  const Component = PANEL_REGISTRY[panelType];
  if (!Component) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded p-4 text-red-400">
        Unknown panel type: {panelType}
      </div>
    );
  }
  return <Component {...props} />;
}
