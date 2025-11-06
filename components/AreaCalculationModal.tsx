import React, { useMemo, useState } from 'react';
import type { Feature } from 'geojson';
import { area as turfArea } from '@turf/turf';

type AreaUnit = 'm²' | 'km²' | 'ha' | 'ft²' | 'acres';

const AREA_UNITS: Record<AreaUnit, { label: string; conversion: number; format: (val: number) => string; }> = {
  'm²': { label: 'Square Meters', conversion: 1, format: (val) => `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²` },
  'km²': { label: 'Square Kilometers', conversion: 0.000001, format: (val) => `${val.toLocaleString(undefined, { maximumFractionDigits: 3 })} km²` },
  ha: { label: 'Hectares', conversion: 0.0001, format: (val) => `${val.toLocaleString(undefined, { maximumFractionDigits: 3 })} ha` },
  'ft²': { label: 'Square Feet', conversion: 10.7639, format: (val) => `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft²` },
  acres: { label: 'Acres', conversion: 0.000247105, format: (val) => `${val.toLocaleString(undefined, { maximumFractionDigits: 3 })} acres` },
};

interface AreaCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: { layerId: string; feature: Feature }[];
}

const AreaCalculationModal: React.FC<AreaCalculationModalProps> = ({ isOpen, onClose, assets }) => {
    const [areaUnit, setAreaUnit] = useState<AreaUnit>('m²');

    const calculation = useMemo(() => {
        const polygonAssets = assets.filter(
            a => a.feature.geometry && (a.feature.geometry.type === 'Polygon' || a.feature.geometry.type === 'MultiPolygon')
        );

        if (polygonAssets.length === 0) {
            return { totalArea: 0, count: 0 };
        }

        const totalArea = polygonAssets.reduce((sum, asset) => {
            try {
                return sum + turfArea(asset.feature);
            } catch {
                return sum;
            }
        }, 0);

        return { totalArea, count: polygonAssets.length };
    }, [assets]);
    
    const formattedArea = useMemo(() => {
        const unitConfig = AREA_UNITS[areaUnit];
        const convertedValue = calculation.totalArea * unitConfig.conversion;
        return unitConfig.format(convertedValue);
    }, [calculation.totalArea, areaUnit]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[3000] flex items-center justify-center"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">calculate</span>
                        <h2 className="text-lg font-bold text-slate-800">Area Calculation</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
                    </button>
                </header>
                
                <div className="p-6 text-center">
                    <p className="text-sm text-slate-600">
                        Total area for <span className="font-bold text-primary">{calculation.count}</span> selected feature{calculation.count !== 1 ? 's' : ''}
                    </p>
                    <p className="text-5xl font-bold tracking-tight text-slate-900 my-4">
                        {formattedArea}
                    </p>
                    
                    <div className="inline-block relative">
                        <select
                            value={areaUnit}
                            onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                            className="form-select appearance-none block w-full bg-slate-100 border-slate-300 hover:border-slate-400 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-medium"
                        >
                            {Object.entries(AREA_UNITS).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>

                <footer className="p-4 bg-slate-50 border-t border-slate-200 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
                    >
                        Done
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AreaCalculationModal;
