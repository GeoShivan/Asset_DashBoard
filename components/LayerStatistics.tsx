import React, { useMemo } from 'react';
import { area } from '@turf/turf';
import type { GeoJsonLayer } from '../types';
import { Feature } from 'geojson';

interface LayerStatisticsProps {
  layer: GeoJsonLayer;
  onClose: () => void;
  onCategoryFilter: (propertyKey: string, propertyValue: string) => void;
  onFeatureSelect: (feature: Feature) => void;
}

type CategoricalStats = {
  [value: string]: number;
};

// Helper to format area into m² or km²
const formatArea = (meters: number): string => {
  if (meters >= 1_000_000) {
    return `${(meters / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km²`;
  }
  return `${meters.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²`;
};

const LayerStatistics: React.FC<LayerStatisticsProps> = ({ layer, onClose, onCategoryFilter, onFeatureSelect }) => {
  const { categoricalStats, areaStats } = useMemo(() => {
    const categorical: { [key: string]: CategoricalStats } = {};

    let totalArea = 0;
    const featuresWithArea = layer.data.features.map((feature, index) => {
        let featureArea = 0;
        try {
            if (feature.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                featureArea = area(feature);
            }
        } catch (e) {
            console.warn("Could not calculate area for a feature:", e);
        }
        totalArea += featureArea;
        const featureName = feature.properties?.Name || feature.properties?.name || `Feature ${feature.properties?.fid || index + 1}`;
        return { name: featureName, area: featureArea, feature };
    }).filter(f => f.area > 0).sort((a, b) => b.area - a.area);

    for (const feature of layer.data.features) {
      if (!feature.properties) continue;

      for (const [key, value] of Object.entries(feature.properties)) {
        if (typeof value !== 'number' && value !== null && value !== undefined) {
          const strValue = String(value).trim();
          if (strValue === '' || strValue.startsWith('http') || strValue.startsWith('D:')) continue;
          if (!categorical[key]) {
            categorical[key] = {};
          }
          categorical[key][strValue] = (categorical[key][strValue] || 0) + 1;
        }
      }
    }
    
    // Sort categorical stats by count
    for (const key in categorical) {
        if (Object.keys(categorical[key]).length < 2) {
            delete categorical[key];
            continue;
        }
        const sortedEntries = Object.entries(categorical[key]).sort(([, a], [, b]) => b - a);
        categorical[key] = Object.fromEntries(sortedEntries);
    }

    return { 
        categoricalStats: categorical,
        areaStats: { totalArea, featuresWithArea },
    };
  }, [layer.data]);

  const categoricalEntries = Object.entries(categoricalStats);

  return (
    <div className="h-full flex flex-col text-slate-200">
      <div className="flex-shrink-0 flex items-center justify-between pb-3 border-b border-slate-800">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-primary hover:text-blue-400 transition-colors group">
          <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1" style={{ fontSize: '20px'}}>arrow_back</span>
          Back to Assets
        </button>
      </div>

      <div className="mt-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-white">Layer Statistics</h2>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span>For layer:</span>
            <span className="font-semibold truncate bg-slate-800/80 px-2 py-1 rounded-md" title={layer.name}>
                {layer.name}
            </span>
        </div>
      </div>
      
      <div className="mt-4 flex-grow overflow-y-auto -mr-4 pr-3 space-y-6">
        {areaStats.featuresWithArea.length > 0 && (
            <div>
                <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Area Analysis</h3>
                <div className="bg-slate-800/50 p-3 rounded-lg text-center mb-4">
                    <p className="text-slate-300 text-xs">Total Calculated Area</p>
                    <p className="text-white font-bold text-2xl tracking-tight">{formatArea(areaStats.totalArea)}</p>
                </div>
                 <div className="space-y-2 text-xs">
                    {areaStats.featuresWithArea.slice(0, 15).map(({ name, area, feature }, index) => {
                       const maxArea = areaStats.featuresWithArea[0]?.area || 1;
                       const percentage = Math.max(1, (area / maxArea) * 100);
                       return (
                          <button
                            key={`${name}-${index}`}
                            onClick={() => onFeatureSelect(feature)}
                            className="grid grid-cols-6 items-center gap-2 group w-full text-left p-1 rounded-md hover:bg-slate-700/50 transition-colors"
                           >
                            <span className="col-span-2 text-slate-300 truncate" title={name}>{name}</span>
                            <div className="col-span-3 bg-slate-700 rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full transition-all duration-300 group-hover:bg-blue-400" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="text-slate-200 font-medium text-right tabular-nums">{formatArea(area)}</span>
                          </button>
                       )
                    })}
                    {areaStats.featuresWithArea.length > 15 && (
                        <p className="text-slate-500 text-center text-xs mt-2">...and {areaStats.featuresWithArea.length - 15} more features.</p>
                    )}
                 </div>
            </div>
        )}

        {categoricalEntries.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Categorical Fields</h3>
            <div className="space-y-4">
              {categoricalEntries.map(([key, valueCounts]) => (
                <div key={key}>
                  <p className="font-bold text-white mb-2 text-sm truncate">{key}</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(valueCounts).slice(0, 10).map(([value, count]) => {
                       const totalCount = layer.data.features.length;
                       const percentage = Math.max(1, (count / totalCount) * 100);
                       return (
                          <button
                            key={value}
                            onClick={() => onCategoryFilter(key, value)}
                            className="grid grid-cols-5 items-center gap-2 group w-full text-left p-1 rounded-md hover:bg-slate-700/50 transition-colors"
                          >
                            <span className="col-span-2 text-slate-300 truncate" title={value}>{value}</span>
                            <div className="col-span-2 bg-slate-700 rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full transition-all duration-300 group-hover:bg-blue-400" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <span className="text-slate-200 font-medium text-right tabular-nums">{count.toLocaleString()}</span>
                          </button>
                       )
                    })}
                     {Object.keys(valueCounts).length > 10 && (
                        <p className="text-slate-500 text-center text-xs mt-2">...and {Object.keys(valueCounts).length - 10} more unique values.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {categoricalEntries.length === 0 && areaStats.featuresWithArea.length === 0 && (
            <div className="text-center text-slate-500 pt-10">
                <p>No properties or geometric area found to analyze in this layer.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default LayerStatistics;