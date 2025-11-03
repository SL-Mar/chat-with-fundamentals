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
  faChartArea,
  faRobot
} from '@fortawesome/free-solid-svg-icons';

export type AssetTab =
  | 'overview'
  | 'intraday'
  | 'live'
  | 'fundamentals'
  | 'news'
  | 'ai-analysis'
  | 'research'
  | 'compare'
  | 'returns'
  | 'modelling';

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
      { id: 'live', label: 'Live', icon: faChartLine, enabled: true },
    ];

    // Asset-specific tabs (stocks and ETFs)
    if (assetType === 'stock' || assetType === 'etf') {
      baseTabs.push({
        id: 'fundamentals',
        label: 'Fundamentals',
        icon: faDollarSign,
        enabled: true
      });
    }

    // Common tabs (all asset types)
    baseTabs.push(
      { id: 'news', label: 'News', icon: faNewspaper, enabled: true },
      { id: 'ai-analysis', label: 'AI Analysis', icon: faBrain, enabled: true }
    );

    // Research tabs (stocks and ETFs only)
    if (assetType === 'stock' || assetType === 'etf') {
      baseTabs.push({
        id: 'research',
        label: 'Deep Research',
        icon: faMagnifyingGlassChart,
        enabled: true
      });
      baseTabs.push({
        id: 'compare',
        label: 'Peer Compare',
        icon: faScaleBalanced,
        enabled: true
      });
    }

    // Analysis tabs (all asset types except macro)
    baseTabs.push({
      id: 'returns',
      label: 'Returns',
      icon: faChartArea,
      enabled: assetType !== 'macro',
      tooltip: assetType === 'macro' ? 'Not applicable for macro indicators' : undefined
    });
    baseTabs.push({
      id: 'modelling',
      label: 'Modelling',
      icon: faRobot,
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
