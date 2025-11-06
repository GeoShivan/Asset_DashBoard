import React, { useMemo, useState, useRef, useEffect, MouseEvent } from 'react';
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

    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
        if (panelRef.current) {
            setIsDragging(true);
            dragStartOffset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            };
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
        setPosition({
            x: e.clientX - dragStartOffset.current.x,
            y: e.clientY - dragStartOffset.current.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  
    useEffect(() => {
        const setInitialPosition = () => {
            if (panelRef.current) {
                const { innerWidth, innerHeight } = window;
                const { offsetWidth, offsetHeight } = panelRef.current;
                setPosition({
                    x: innerWidth - offsetWidth - 40,
                    y: innerHeight - offsetHeight - 40,
                });
            }
        }
        if (isOpen) {
             const timer = setTimeout(setInitialPosition, 50);
             return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, []);

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
    
    const formattedParts = useMemo(() => {
        const unitConfig = AREA_UNITS[areaUnit];
        const convertedValue = calculation.totalArea * unitConfig.conversion;
        const formatted = unitConfig.format(convertedValue);
        const parts = formatted.split(' ');
        return {
            value: parts[0],
            unit: parts.slice(1).join(' ')
        };
    }, [calculation.totalArea, areaUnit]);

    if (!isOpen) return null;

    const panelClasses = `absolute bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl shadow-2xl w-80 flex flex-col z-[3000] ring-1 ring-black/5 transition-all duration-300 ease-out transform ${isDragging ? 'scale-105 shadow-sky-500/20' : ''}`;

    return (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[2999]">
            <div 
                ref={panelRef}
                className={panelClasses}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    opacity: 1
                }}
            >
                <header 
                    className="px-4 pt-4 pb-2 flex justify-between items-center shrink-0 cursor-move"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-xl">calculate</span>
                        </div>
                        <h2 className="text-base font-bold text-slate-800">Area Calculation</h2>
                    </div>
                    <button onClick={onClose} className="size-7 flex items-center justify-center rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </header>
                
                <div className="px-5 pt-2 pb-5 text-center">
                    <p className="text-xs text-slate-600 mb-2">
                        Total area for <span className="font-bold text-primary">{calculation.count}</span> selected feature{calculation.count !== 1 ? 's' : ''}
                    </p>
                    
                    <div className="bg-white/50 rounded-lg p-4 border border-slate-200/80 shadow-inner">
                        <p className="text-4xl font-bold tracking-tight text-slate-900">
                           {formattedParts.value}
                        </p>
                         <p className="text-sm font-medium text-slate-500">
                           {formattedParts.unit}
                        </p>
                    </div>
                    
                    <div className="mt-4 text-xs font-medium text-slate-500">Change Units</div>
                    <div className="mt-1 grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-lg">
                        {(Object.keys(AREA_UNITS) as AreaUnit[]).slice(0, 3).map((key) => (
                            <button 
                                key={key}
                                onClick={() => setAreaUnit(key)}
                                className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${areaUnit === key ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                     <div className="mt-1 grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-lg">
                        {(Object.keys(AREA_UNITS) as AreaUnit[]).slice(3).map((key) => (
                            <button 
                                key={key}
                                onClick={() => setAreaUnit(key)}
                                className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${areaUnit === key ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AreaCalculationModal;
