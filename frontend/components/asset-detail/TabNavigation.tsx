// components/asset-detail/TabNavigation.tsx
'use client';

import { Dispatch, SetStateAction } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faChartPie,
  faChartLine,
  faDollarSign,
  faNewspaper,
  faBrain,
  faMagnifyingGlassChart,
  faScaleBalanced,
  faDice,
  faExclamationTriangle,
  faBullseye
} from '@fortawesome/free-solid-svg-icons';

export type AssetTab =
  | 'overview'
  | 'intraday'
  | 'fundamentals'
  | 'news'
  | 'ai-analysis'
  | 'research'
  | 'compare'
  | 'monte-carlo'
  | 'risk'
  | 'signals';

interface TabConfig {
  id: AssetTab;
  label: string;
  icon: IconDefinition;
  enabled: boolean;
  tooltip?: string;
}

interface TabNavigationProps {
  activeTab: AssetTab;
  setActiveTab: Dispatch<SetStateAction<AssetTab>>;
  assetType: 'stock' | 'etf' | 'currency' | 'macro';
}

export default function TabNavigation({ activeTab, setActiveTab, assetType }: TabNavigationProps) {
  // Define tabs based on asset type
  const getTabs = (): TabConfig[] => {
    const baseTabs: TabConfig[] = [
      { id: 'overview', label: 'Overview', icon: faChartPie, enabled: true },
      { id: 'intraday', label: 'Intraday', icon: faChartLine, enabled: true },
      { id: 'news', label: 'News', icon: faNewspaper, enabled: true },
      { id: 'ai-analysis', label: 'AI Analysis', icon: faBrain, enabled: true },
      { id: 'signals', label: 'Signals', icon: faBullseye, enabled: true },
    ];

    // Asset-specific tabs
    if (assetType === 'stock' || assetType === 'etf') {
      baseTabs.splice(2, 0, {
        id: 'fundamentals',
        label: 'Fundamentals',
        icon: faDollarSign,
        enabled: true
      });
      baseTabs.splice(5, 0, {
        id: 'research',
        label: 'Deep Research',
        icon: faMagnifyingGlassChart,
        enabled: true
      });
      baseTabs.splice(6, 0, {
        id: 'compare',
        label: 'Peer Compare',
        icon: faScaleBalanced,
        enabled: true
      });
    }

    // Risk analysis tabs (all asset types)
    baseTabs.push({
      id: 'monte-carlo',
      label: 'Monte Carlo',
      icon: faDice,
      enabled: assetType !== 'macro',
      tooltip: assetType === 'macro' ? 'Not applicable for macro indicators' : undefined
    });
    baseTabs.push({
      id: 'risk',
      label: 'Risk (VaR)',
      icon: faExclamationTriangle,
      enabled: assetType !== 'macro',
      tooltip: assetType === 'macro' ? 'Not applicable for macro indicators' : undefined
    });

    return baseTabs;
  };

  const tabs = getTabs();

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.enabled && setActiveTab(tab.id)}
            disabled={!tab.enabled}
            title={tab.tooltip}
            className={`
              px-4 py-3 font-semibold text-sm whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                : tab.enabled
                  ? 'text-slate-400 hover:text-white hover:bg-slate-750'
                  : 'text-slate-600 cursor-not-allowed'
              }
            `}
          >
            <FontAwesomeIcon icon={tab.icon} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
