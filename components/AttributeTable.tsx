import React, { useState, useMemo, useRef, useEffect, MouseEvent } from 'react';
import type { Feature } from 'geojson';
import type { GeoJsonLayer } from '../types';
import { getFeatureDisplayName } from '../utils';

interface AttributeTableProps {
  layer: GeoJsonLayer;
  onClose: () => void;
  onFeatureSelect: (feature: Feature) => void;
}

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
} | null;

const ValueDisplay: React.FC<{ value: any }> = ({ value }) => {
    if (value === null || value === undefined) {
        return <span className="text-slate-400">null</span>;
    }
    const lowerValue = String(value).toLowerCase();
    if (typeof value === 'number') {
        return <span className="text-cyan-600 font-mono">{value.toLocaleString()}</span>;
    }
    if (lowerValue === 'yes') {
        return <span className="text-green-600 font-semibold">Yes</span>;
    }
    if (lowerValue === 'no') {
        return <span className="text-red-600 font-semibold">No</span>;
    }

    return <span>{String(value)}</span>;
};


const AttributeTable: React.FC<AttributeTableProps> = ({ layer, onClose, onFeatureSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

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
        if(panelRef.current) {
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = panelRef.current;
            setPosition({
                x: (innerWidth - offsetWidth) / 2,
                y: (innerHeight - offsetHeight) / 2
            });
        }
    }
    const timer = setTimeout(setInitialPosition, 50);

    return () => {
        clearTimeout(timer);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);


  const headers = useMemo(() => {
    const allKeys = new Set<string>();
    layer.data.features.forEach(feature => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => allKeys.add(key));
      }
    });
    const sortedKeys = Array.from(allKeys).sort();
    return ['Display Name', ...sortedKeys];
  }, [layer.data.features]);

  const rows = useMemo(() => {
    let featureData = [...layer.data.features];

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      featureData = featureData.filter(feature => {
        if (!feature.properties) return false;
        return Object.values(feature.properties).some(value =>
          String(value).toLowerCase().includes(lowercasedFilter)
        );
      });
    }

    if (sortConfig !== null) {
      featureData.sort((a, b) => {
        const key = sortConfig.key;
        let aValue: any;
        let bValue: any;

        if (key === 'Display Name') {
            aValue = getFeatureDisplayName(a);
            bValue = getFeatureDisplayName(b);
        } else {
            aValue = a.properties?.[key];
            bValue = b.properties?.[key];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr < bStr) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return featureData;
  }, [layer.data.features, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600" style={{ fontSize: '16px' }}>unfold_more</span>;
    }
    const icon = sortConfig.direction === 'ascending' ? 'expand_less' : 'expand_more';
    return <span className="material-symbols-outlined text-teal-500" style={{ fontSize: '16px' }}>{icon}</span>;
  };
  
  const panelClasses = `absolute top-0 left-0 bg-white border border-slate-200 rounded-xl shadow-2xl w-[80vw] max-w-6xl h-[70vh] flex flex-col overflow-hidden z-[2000] ring-1 ring-black/5 ${!isDragging ? 'transition-transform duration-300 ease-out' : ''}`;

  return (
    <div 
        ref={panelRef}
        className={panelClasses}
        style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(1)`,
            opacity: 1
        }}
    >
        <header 
            className="p-4 border-b border-slate-200 flex justify-between items-center shrink-0 cursor-move bg-white/70 backdrop-blur-sm"
            onMouseDown={handleMouseDown}
        >
            <div>
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">Attribute Table</h2>
                <p className="text-sm text-slate-500">Layer: {layer.name}</p>
            </div>
            <div className="flex items-center gap-4">
                 <label className="flex flex-col min-w-40 !h-10 max-w-full rounded-lg bg-slate-100 transition-all focus-within:ring-2 focus-within:ring-primary/50 border border-slate-200">
                    <div className="flex w-full flex-1 items-stretch h-full">
                        <div className="text-slate-500 flex items-center justify-center pl-3">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                        </div>
                        <input 
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-800 focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-slate-500 px-2 text-sm font-normal leading-normal" 
                            placeholder="Filter data..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </label>
                <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={header} scope="col" className={`px-4 py-3 whitespace-nowrap font-semibold border-b-2 ${sortConfig?.key === header ? 'border-teal-400 border-dashed' : 'border-slate-200'} ${idx === 0 ? 'sticky left-0 bg-slate-50 border-r border-slate-200' : ''}`}>
                                <div className="flex items-center gap-1 cursor-pointer group" onClick={() => requestSort(header)}>
                                    {header}
                                    {getSortIcon(header)}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((feature, index) => (
                        <tr 
                            key={feature.properties?.fid || index} 
                            className="group border-b border-slate-200 hover:bg-primary/10 even:bg-slate-50/50 cursor-pointer transition-colors"
                            onClick={() => onFeatureSelect(feature)}
                        >
                           {headers.map((header, idx) => (
                                <td key={header} className={`px-4 py-3 whitespace-nowrap max-w-xs truncate ${idx === 0 ? 'sticky left-0 bg-white group-even:bg-slate-50/50 group-hover:bg-primary/10 border-r border-slate-200 font-medium text-teal-600' : ''}`} title={String(header === 'Display Name' ? getFeatureDisplayName(feature) : (feature.properties?.[header] || ''))}>
                                    {header === 'Display Name' 
                                        ? getFeatureDisplayName(feature)
                                        : <ValueDisplay value={feature.properties?.[header]} />
                                    }
                                </td>
                           ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                    <p>No matching features found.</p>
                </div>
            )}
        </div>

        <footer className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 shrink-0">
            Showing <span className="font-semibold text-slate-800">{rows.length.toLocaleString()}</span> of <span className="font-semibold text-slate-800">{layer.data.features.length.toLocaleString()}</span> features.
        </footer>
    </div>
  );
};

export default AttributeTable;