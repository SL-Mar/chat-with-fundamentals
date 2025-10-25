/**
 * Dashboard Gallery Page
 *
 * Browse and select from pre-built dashboard templates.
 * Customize templates with your own tickers and save custom layouts.
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { DASHBOARD_TEMPLATES, createDashboardFromTemplate } from '../config/dashboardTemplates';
import { DashboardTemplate } from '../types/dashboard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faChartBar,
  faNewspaper,
  faLayerGroup,
  faGlobe,
  faPlus,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

const CATEGORY_ICONS = {
  'technical-analysis': faChartLine,
  'fundamental-analysis': faChartBar,
  'news-sentiment': faNewspaper,
  'multi-stock': faLayerGroup,
  'market-overview': faGlobe,
  'custom': faPlus,
} as const;

const CATEGORY_COLORS = {
  'technical-analysis': 'bg-blue-600',
  'fundamental-analysis': 'bg-green-600',
  'news-sentiment': 'bg-purple-600',
  'multi-stock': 'bg-orange-600',
  'market-overview': 'bg-indigo-600',
  'custom': 'bg-gray-600',
} as const;

export default function DashboardsPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
  const [customTicker, setCustomTicker] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const handleTemplateClick = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    setCustomTicker(template.defaultTicker || '');
    setCustomName('');
    setShowCustomizeModal(true);
  };

  const handleCreateDashboard = () => {
    if (!selectedTemplate) return;

    const dashboard = createDashboardFromTemplate(
      selectedTemplate,
      customTicker || undefined,
      customName || undefined
    );

    // Store in localStorage (later will be saved to backend)
    const savedDashboards = JSON.parse(localStorage.getItem('dashboards') || '[]');
    savedDashboards.push(dashboard);
    localStorage.setItem('dashboards', JSON.stringify(savedDashboards));

    // Navigate to dashboard viewer
    router.push(`/dashboard/${dashboard.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Dashboard Templates</h1>
          <p className="text-gray-400">
            Choose a pre-built template and customize it with your own tickers
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DASHBOARD_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => handleTemplateClick(template)}
            />
          ))}
        </div>

        {/* Empty state for custom dashboards (future feature) */}
        <div className="mt-12 p-8 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 text-center">
          <FontAwesomeIcon icon={faPlus} className="text-4xl text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Create Custom Dashboard</h3>
          <p className="text-gray-400 mb-4">
            Build your own dashboard from scratch with drag-and-drop editor
          </p>
          <button
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
            onClick={() => alert('Drag-and-drop editor coming in Phase 3B!')}
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Customize Modal */}
      {showCustomizeModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">{selectedTemplate.name}</h2>
            <p className="text-gray-400 mb-6">{selectedTemplate.description}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  value={customTicker}
                  onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave blank to use default: {selectedTemplate.defaultTicker}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Dashboard Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., My AAPL Analysis"
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDashboard}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Create Dashboard
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Template Card Component
 */
interface TemplateCardProps {
  template: DashboardTemplate;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  const icon = CATEGORY_ICONS[template.category] || faChartLine;
  const colorClass = CATEGORY_COLORS[template.category] || 'bg-gray-600';

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-all cursor-pointer group"
    >
      {/* Icon */}
      <div className={`${colorClass} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        <FontAwesomeIcon icon={icon} className="text-2xl" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-400 transition-colors">
        {template.name}
      </h3>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{template.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {template.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-700 text-xs rounded-full text-gray-300"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Panels count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {template.dashboard.panels.length} panels
        </span>
        <span className="text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
          Use Template
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </span>
      </div>
    </div>
  );
}
