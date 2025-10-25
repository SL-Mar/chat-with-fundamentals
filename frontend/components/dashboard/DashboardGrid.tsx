/**
 * Dashboard Grid Component
 *
 * Renders a grid of dashboard panels using react-grid-layout.
 * Supports drag-and-drop, resizing, and responsive breakpoints.
 */

'use client';

import React, { useState, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { Dashboard, DashboardPanel } from '../../types/dashboard';
import PanelRenderer from './PanelRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTimes } from '@fortawesome/free-solid-svg-icons';

// Import react-grid-layout CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardGridProps {
  dashboard: Dashboard;
  isEditing?: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
  onPanelRemove?: (panelId: string) => void;
}

export default function DashboardGrid({
  dashboard,
  isEditing = false,
  onLayoutChange,
  onPanelRemove,
}: DashboardGridProps) {
  const { gridConfig, panels } = dashboard;

  // Convert dashboard panels to react-grid-layout format
  const layout: Layout[] = panels.map((panel) => ({
    i: panel.id,
    x: panel.layout.x,
    y: panel.layout.y,
    w: panel.layout.w,
    h: panel.layout.h,
    minW: panel.layout.minW,
    minH: panel.layout.minH,
    maxW: panel.layout.maxW,
    maxH: panel.layout.maxH,
    static: panel.layout.static || !isEditing,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      if (onLayoutChange) {
        onLayoutChange(newLayout);
      }
    },
    [onLayoutChange]
  );

  const handleRemovePanel = useCallback(
    (panelId: string) => {
      if (onPanelRemove) {
        onPanelRemove(panelId);
      }
    },
    [onPanelRemove]
  );

  return (
    <div className="dashboard-grid">
      <GridLayout
        className="layout"
        layout={layout}
        cols={gridConfig.cols}
        rowHeight={gridConfig.rowHeight}
        width={1200} // Will be overridden by container width
        compactType={gridConfig.compactType || 'vertical'}
        preventCollision={gridConfig.preventCollision || false}
        isDraggable={isEditing && (gridConfig.isDraggable ?? true)}
        isResizable={isEditing && (gridConfig.isResizable ?? true)}
        margin={gridConfig.margin || [16, 16]}
        containerPadding={gridConfig.containerPadding || [16, 16]}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {panels.map((panel) => (
          <div
            key={panel.id}
            className="dashboard-panel-container"
            data-grid={{
              i: panel.id,
              x: panel.layout.x,
              y: panel.layout.y,
              w: panel.layout.w,
              h: panel.layout.h,
            }}
          >
            <div className="relative h-full">
              {/* Edit Mode Controls */}
              {isEditing && (
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  {/* Drag Handle */}
                  <button
                    className="drag-handle cursor-move bg-gray-700 hover:bg-gray-600 p-2 rounded"
                    title="Drag to reposition"
                  >
                    <FontAwesomeIcon icon={faGripVertical} className="text-gray-300" />
                  </button>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemovePanel(panel.id)}
                    className="bg-red-600 hover:bg-red-500 p-2 rounded"
                    title="Remove panel"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-white" />
                  </button>
                </div>
              )}

              {/* Panel Content */}
              <PanelRenderer panel={panel} />
            </div>
          </div>
        ))}
      </GridLayout>

      {/* Custom Styles */}
      <style jsx global>{`
        .dashboard-grid {
          width: 100%;
        }

        .dashboard-panel-container {
          background: transparent;
        }

        /* Grid item styles */
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }

        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }

        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.8;
        }

        .react-grid-item.dropping {
          visibility: hidden;
        }

        .react-grid-item.react-grid-placeholder {
          background: rgba(99, 102, 241, 0.3);
          opacity: 0.5;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: 8px;
          border: 2px dashed rgba(99, 102, 241, 0.8);
        }

        /* Resize handle styles */
        .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }

        .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }

        .react-resizable-handle-se::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(156, 163, 175, 0.5);
          border-bottom: 2px solid rgba(156, 163, 175, 0.5);
        }

        .react-grid-item:hover .react-resizable-handle-se::after {
          border-right-color: rgba(99, 102, 241, 0.8);
          border-bottom-color: rgba(99, 102, 241, 0.8);
        }
      `}</style>
    </div>
  );
}
