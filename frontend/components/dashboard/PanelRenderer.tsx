/**
 * Panel Renderer Component
 *
 * Dynamically renders the correct component based on panel type.
 * Maps panel types to their corresponding React components.
 */

import React from 'react';
import { DashboardPanel } from '../../types/dashboard';

// Import all panel components
import TradingViewChart from '../TradingViewChart';
import IntradayChart from '../IntradayChart';
import ComparisonChart from '../ComparisonChart';
import CumulativeReturnChart from '../CumulativeReturnChart';
import MarketCapHistory from '../MarketCapHistory';
import CompanyHeader from '../CompanyHeader';
import Metrics from '../Metrics';
import PerfRatiosPanel from '../PerfRatiosPanel';
import ReturnsAnalytics from '../ReturnsAnalytics';
import VolForecastCard from '../VolForecastCard';
import NewsList from '../NewsList';
import SentimentAnalysis from '../SentimentAnalysis';
import AnalystRatings from '../AnalystRatings';
import DividendHistory from '../DividendHistory';
import InsiderTransactions from '../InsiderTransactions';
import EarningsCalendar from '../EarningsCalendar';
import TechnicalIndicators from '../TechnicalIndicators';
import IndexConstituents from '../IndexConstituents';
import ETFHoldings from '../ETFHoldings';
import MacroIndicators from '../MacroIndicators';
import InterestRates from '../InterestRates';
import EconomicCalendar from '../EconomicCalendar';

interface PanelRendererProps {
  panel: DashboardPanel;
}

export default function PanelRenderer({ panel }: PanelRendererProps) {
  const { type, config, title } = panel;

  // Render the appropriate component based on panel type
  const renderPanelContent = () => {
    switch (type) {
      // Chart Panels
      case 'candlestick-chart':
        return (
          <TradingViewChart
            ticker={config.ticker || 'AAPL.US'}
            interval={config.period || '1d'}
          />
        );

      case 'intraday-chart':
        return (
          <IntradayChart
            ticker={config.ticker || 'AAPL.US'}
            interval="5m"
          />
        );

      case 'comparison-chart':
        return (
          <ComparisonChart
            tickers={config.tickers || [config.ticker || 'AAPL.US']}
            period={config.period || '1Y'}
          />
        );

      case 'cumulative-return-chart':
        return (
          <CumulativeReturnChart
            tickers={config.tickers || [config.ticker || 'AAPL.US']}
            benchmark={config.benchmark || 'SPY.US'}
            years={config.years || 1}
          />
        );

      case 'market-cap-history':
        return <MarketCapHistory ticker={config.ticker || 'AAPL.US'} />;

      // Financial Data Panels
      case 'company-header':
        return <CompanyHeader ticker={config.ticker || 'AAPL.US'} />;

      case 'metrics':
        return <Metrics ticker={config.ticker || 'AAPL.US'} />;

      case 'performance-ratios':
        return (
          <PerfRatiosPanel
            ticker={config.ticker || 'AAPL.US'}
            years={config.years || 3}
          />
        );

      case 'returns-analytics':
        return (
          <ReturnsAnalytics
            ticker={config.ticker || 'AAPL.US'}
            benchmark={config.benchmark || 'SPY.US'}
            years={config.years || 3}
          />
        );

      case 'vol-forecast':
        return (
          <VolForecastCard
            ticker={config.ticker || 'AAPL.US'}
            lookback={config.options?.lookback || 250}
          />
        );

      // News & Sentiment
      case 'news-list':
        return (
          <NewsList
            ticker={config.ticker || 'AAPL.US'}
            limit={config.limit || 10}
          />
        );

      case 'sentiment-analysis':
        return <SentimentAnalysis ticker={config.ticker || 'AAPL.US'} />;

      case 'analyst-ratings':
        return <AnalystRatings ticker={config.ticker || 'AAPL.US'} />;

      // Corporate Actions
      case 'dividend-history':
        return (
          <DividendHistory
            ticker={config.ticker || 'AAPL.US'}
            limit={config.limit || 10}
          />
        );

      case 'insider-transactions':
        return (
          <InsiderTransactions
            ticker={config.ticker || 'AAPL.US'}
            limit={config.limit || 15}
          />
        );

      case 'earnings-calendar':
        return (
          <EarningsCalendar
            fromDate={config.fromDate}
            toDate={config.toDate}
            limit={config.limit || 15}
          />
        );

      // Technical Analysis
      case 'technical-indicators':
        return (
          <TechnicalIndicators
            ticker={config.ticker || 'AAPL.US'}
            indicators={config.indicators || ['RSI', 'MACD', 'SMA']}
          />
        );

      // Market Data
      case 'index-constituents':
        return <IndexConstituents index={config.index || 'GSPC'} />;

      case 'etf-holdings':
        return <ETFHoldings ticker={config.ticker || 'SPY.US'} />;

      case 'macro-indicators':
        return (
          <MacroIndicators
            indicators={config.indicators || ['10Y_YIELD', 'VIX', 'DXY']}
          />
        );

      case 'interest-rates':
        return <InterestRates />;

      case 'economic-calendar':
        return (
          <EconomicCalendar
            fromDate={config.fromDate}
            toDate={config.toDate}
            limit={config.limit || 10}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Unknown panel type: {type}</p>
              <p className="text-sm">Component not implemented yet</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full bg-gray-800 rounded-lg overflow-hidden flex flex-col">
      {/* Panel Header */}
      {title && (
        <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
          <h3 className="font-semibold text-white text-sm truncate">{title}</h3>
        </div>
      )}

      {/* Panel Content */}
      <div className="flex-1 overflow-auto p-4">
        {renderPanelContent()}
      </div>
    </div>
  );
}
