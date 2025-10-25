/**
 * Dashboard Viewer Page
 *
 * Displays a dashboard with its configured panels.
 * Supports view mode and edit mode with drag-and-drop.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from 'react-grid-layout';
import { Dashboard } from '../../types/dashboard';
import DashboardGrid from '../../components/dashboard/DashboardGrid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faSave,
  faTimes,
  faArrowLeft,
  faTrash,
  faShareAlt,
} from '@fortawesome/free-solid-svg-icons';

export default function DashboardPage() {
  const router = useRouter();
  const { id } = router.query;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard from localStorage
  useEffect(() => {
    if (!id) return;

    try {
      const savedDashboards = JSON.parse(localStorage.getItem('dashboards') || '[]');
      const found = savedDashboards.find((d: Dashboard) => d.id === id);

      if (found) {
        setDashboard(found);
      } else {
        setError('Dashboard not found');
      }
    } catch (err) {
      setError('Failed to load dashboard');
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!dashboard) return;

    // Update panel layouts
    const updatedPanels = dashboard.panels.map((panel) => {
      const layoutItem = newLayout.find((l) => l.i === panel.id);
      if (layoutItem) {
        return {
          ...panel,
          layout: {
            ...panel.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        };
      }
      return panel;
    });

    setDashboard({
      ...dashboard,
      panels: updatedPanels,
      updatedAt: new Date().toISOString(),
    });
  };

  const handlePanelRemove = (panelId: string) => {
    if (!dashboard) return;

    const updatedPanels = dashboard.panels.filter((p) => p.id !== panelId);
    setDashboard({
      ...dashboard,
      panels: updatedPanels,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    if (!dashboard) return;

    try {
      // Save to localStorage
      const savedDashboards = JSON.parse(localStorage.getItem('dashboards') || '[]');
      const index = savedDashboards.findIndex((d: Dashboard) => d.id === dashboard.id);

      if (index >= 0) {
        savedDashboards[index] = dashboard;
      } else {
        savedDashboards.push(dashboard);
      }

      localStorage.setItem('dashboards', JSON.stringify(savedDashboards));

      setIsEditing(false);
      alert('Dashboard saved successfully!');
    } catch (err) {
      alert('Failed to save dashboard');
      console.error('Dashboard save error:', err);
    }
  };

  const handleDelete = () => {
    if (!dashboard) return;

    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      const savedDashboards = JSON.parse(localStorage.getItem('dashboards') || '[]');
      const filtered = savedDashboards.filter((d: Dashboard) => d.id !== dashboard.id);
      localStorage.setItem('dashboards', JSON.stringify(filtered));

      router.push('/dashboards');
    } catch (err) {
      alert('Failed to delete dashboard');
      console.error('Dashboard delete error:', err);
    }
  };

  const handleShare = () => {
    if (!dashboard) return;

    // Copy URL to clipboard
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Dashboard URL copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Dashboard not found'}</p>
          <button
            onClick={() => router.push('/dashboards')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          >
            Back to Dashboards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboards')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Back to dashboards"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            <div>
              <h1 className="text-xl font-bold">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-sm text-gray-400">{dashboard.description}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faTimes} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faSave} />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Share dashboard"
                >
                  <FontAwesomeIcon icon={faShareAlt} />
                  Share
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Delete dashboard"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditing && (
        <div className="bg-indigo-600 px-6 py-3 text-center">
          <p className="font-medium">
            Edit Mode Active - Drag panels to reposition, resize by dragging corners, or remove
            unwanted panels
          </p>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <DashboardGrid
            dashboard={dashboard}
            isEditing={isEditing}
            onLayoutChange={handleLayoutChange}
            onPanelRemove={handlePanelRemove}
          />
        </div>
      </div>

      {/* Empty State */}
      {dashboard.panels.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">
            This dashboard has no panels yet.
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          >
            Add Panels
          </button>
        </div>
      )}
    </div>
  );
}
