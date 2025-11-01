// components/asset-detail/tabs/PlaceholderTab.tsx
'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCheck, faHammer } from '@fortawesome/free-solid-svg-icons';

interface PlaceholderTabProps {
  title: string;
  icon: IconDefinition;
  description: string;
  features?: string[];
}

export default function PlaceholderTab({ title, icon, description, features }: PlaceholderTabProps) {
  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 text-slate-400">
            <FontAwesomeIcon icon={icon} />
          </div>
          <h2 className="text-3xl font-bold mb-2">{title}</h2>
          <p className="text-lg text-slate-400">{description}</p>
        </div>

        {/* Features List */}
        {features && features.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
            <h3 className="text-xl font-bold mb-4">Planned Features</h3>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <FontAwesomeIcon icon={faCheck} className="text-blue-400 mt-1" />
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Coming Soon Badge */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 text-center">
          <div className="text-blue-300 font-semibold mb-2 flex items-center justify-center gap-2">
            <FontAwesomeIcon icon={faHammer} />
            <span>Under Development</span>
          </div>
          <p className="text-sm text-slate-400">
            This feature is currently being developed and will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
