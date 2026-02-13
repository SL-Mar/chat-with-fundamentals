import { useEffect, useState } from 'react';
import * as api from '../../lib/api';
import { FactorDefinition } from '../../types/factor';
import FactorHeatmap from '../charts/FactorHeatmap';

interface Props {
  universeId: string;
}

export default function FactorsTab({ universeId }: Props) {
  const [catalog, setCatalog] = useState<FactorDefinition[]>([]);

  useEffect(() => {
    api.getFactorCatalog().then(setCatalog).catch(() => {});
  }, []);

  const categories = [...new Set(catalog.map((f) => f.category))];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Factor Catalog</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h4 className="text-sm font-medium text-white mb-2">{cat}</h4>
              <div className="space-y-1">
                {catalog
                  .filter((f) => f.category === cat)
                  .map((f) => (
                    <div key={f.name} className="flex justify-between text-sm">
                      <span className="text-gray-300">{f.display_name}</span>
                      <span className="text-xs text-gray-500">{f.description}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Factor Heatmap</h3>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <FactorHeatmap />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Use the Chat tab to compute factors: &quot;Generate momentum factor for all stocks&quot;
        </p>
      </div>
    </div>
  );
}
