import React from 'react';
import type { GeoJsonLayer } from '../types';
import type { Feature } from 'geojson';
import { getFeatureDisplayName, getFeatureStatus } from '../utils';
import LayerStatistics from './LayerStatistics';

interface Asset {
    layerId: string;
    feature: Feature;
    layerName: string;
    layerColor: string;
}

interface LeftSidebarProps {
    layers: GeoJsonLayer[];
    activeLayerTab: string;
    setActiveLayerTab: (name: string) => void;
    layerVisibility: Record<string, boolean>;
    onVisibilityChange: (name: string, isVisible: boolean) => void;
    onZoomToLayer: (layerId: string) => void;
    onOpenAttributeTable: (layerId: string) => void;
    onCategoryFilter: (layerId: string, key: string, value: string) => void;
    assets: Asset[];
    selectedAsset: { layerId: string; feature: Feature } | null;
    onAssetSelect: (layerId: string, feature: Feature) => void;
    assetSearchTerm: string;
    onAssetSearchChange: (term: string) => void;
    propertySearchKey: string;
    propertySearchValue: string;
    onPropertyFilterClear: () => void;
    sidebarView: 'assets' | 'statistics';
    setSidebarView: (view: 'assets' | 'statistics') => void;
}

const layerIcons: Record<string, string> = {
    'Buildings': 'apartment',
    'Horticulture': 'local_florist',
    'Roads': 'road',
};

const layerIconColors: Record<string, string> = {
    'Buildings': 'text-orange-500',
    'Horticulture': 'text-green-500',
    'Roads': 'text-slate-500',
};

const AssetCard: React.FC<{ asset: Asset; isSelected: boolean; onSelect: () => void; }> = ({ asset, isSelected, onSelect }) => {
    const { status, color } = getFeatureStatus(asset.feature);
    const displayName = getFeatureDisplayName(asset.feature);
    
    const borderStyle = { borderLeft: `3px solid ${asset.layerColor}` };

    return (
        <div 
            onClick={onSelect}
            style={borderStyle}
            className={`flex flex-col gap-1 p-3 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-primary/10' : 'bg-white hover:bg-slate-50'}`}
        >
            <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-800 truncate pr-2" title={displayName}>{displayName}</p>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">{asset.layerName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
                <p className="text-slate-500">ID: {asset.feature.properties?.fid || 'N/A'}</p>
                <p className={`font-medium ${color}`}>{status}</p>
            </div>
        </div>
    );
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    layers, activeLayerTab, setActiveLayerTab, layerVisibility, onVisibilityChange, onZoomToLayer,
    onOpenAttributeTable, onCategoryFilter, assets, selectedAsset, onAssetSelect, assetSearchTerm, onAssetSearchChange,
    propertySearchKey, propertySearchValue, onPropertyFilterClear,
    sidebarView, setSidebarView,
}) => {
    const activeLayer = layers.find(l => l.name === activeLayerTab);
    
    return (
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white z-10">
            <div className="p-4 space-y-6 shrink-0">
                <div>
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-2 text-slate-900">Layers</h3>
                    <div className="flex flex-col gap-1 mt-3 px-2 text-slate-700">
                        {layers.map(layer => (
                            <div 
                                key={layer.id}
                                className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${activeLayerTab === layer.name ? 'bg-blue-100 text-blue-800 font-semibold' : 'hover:bg-slate-100'}`}
                            >
                                <div 
                                    className="flex items-center gap-3 flex-1"
                                    onClick={() => {
                                        setActiveLayerTab(layer.name);
                                        setSidebarView('assets');
                                    }}
                                >
                                    <span className={`material-symbols-outlined ${layerIconColors[layer.name] || 'text-slate-500'}`} style={{ fontSize: '24px' }}>{layerIcons[layer.name] || 'layers'}</span>
                                    <p className={`text-sm leading-normal`}>{layer.name}</p>
                                </div>
                                <div className="flex items-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onVisibilityChange(layer.name, !layerVisibility[layer.name]);
                                        }}
                                        title={layerVisibility[layer.name] ? "Hide layer" : "Show layer"}
                                        className={`p-1 rounded-md ${layerVisibility[layer.name] ? 'text-slate-600' : 'text-slate-400'} hover:bg-slate-300/50 hover:text-slate-800 transition-all`}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                            {layerVisibility[layer.name] ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenAttributeTable(layer.id);
                                        }}
                                        disabled={layer.data.features.length === 0}
                                        title="Open attribute table"
                                        className={`p-1 rounded-md text-slate-500 opacity-0 group-hover:opacity-100 ${activeLayerTab === layer.name ? 'opacity-100' : ''} hover:bg-slate-300/50 hover:text-slate-800 disabled:text-slate-400 disabled:bg-transparent disabled:cursor-not-allowed transition-all`}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>table_chart</span>
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onZoomToLayer(layer.id);
                                        }}
                                        disabled={layer.data.features.length === 0}
                                        title="Zoom to layer"
                                        className={`p-1 rounded-md text-slate-500 opacity-0 group-hover:opacity-100 ${activeLayerTab === layer.name ? 'opacity-100' : ''} hover:bg-slate-300/50 hover:text-slate-800 disabled:text-slate-400 disabled:bg-transparent disabled:cursor-not-allowed transition-all`}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>travel_explore</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col min-h-0 border-t border-slate-200 flex-1 bg-white">
                {sidebarView === 'assets' && (
                    <div className="p-4 flex flex-col gap-4 h-full">
                        <div className="px-2 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-slate-900">Assets ({assets.length})</h3>
                             <button 
                                onClick={() => setSidebarView('statistics')} 
                                title="Analyze Layer"
                                disabled={!activeLayer || activeLayer.data.features.length === 0}
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:text-slate-400 disabled:bg-transparent disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>bar_chart</span>
                            </button>
                        </div>

                        <div className="px-2 space-y-3 shrink-0">
                            <label className="flex flex-col min-w-40 !h-10 max-w-full">
                                <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-100 border border-slate-200">
                                    <div className="text-slate-500 flex items-center justify-center pl-3">
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                                    </div>
                                    <input 
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-800 focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-slate-500 px-2 text-sm font-normal leading-normal" 
                                        placeholder="Search by name or ID..." 
                                        value={assetSearchTerm}
                                        onChange={(e) => onAssetSearchChange(e.target.value)}
                                    />
                                </div>
                            </label>

                             {propertySearchKey && propertySearchValue && (
                                <div className="flex items-center justify-between text-xs bg-primary/10 text-primary-700 p-2 rounded-md">
                                    <span className="font-medium truncate">
                                        Filter: {propertySearchKey} = "{propertySearchValue}"
                                    </span>
                                    <button onClick={onPropertyFilterClear} className="p-1 rounded-full hover:bg-primary/20">
                                         <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 px-2 flex-1 overflow-y-auto -mr-4 pr-3 pt-2 pb-2">
                           {assets.map((asset, index) => (
                                <AssetCard 
                                    key={`${asset.layerId}-${asset.feature.properties?.fid || index}`} 
                                    asset={asset}
                                    isSelected={selectedAsset?.layerId === asset.layerId && String(selectedAsset?.feature.properties?.fid) === String(asset.feature.properties?.fid)}
                                    onSelect={() => onAssetSelect(asset.layerId, asset.feature)}
                                />
                           ))}
                        </div>
                    </div>
                )}
                 {sidebarView === 'statistics' && activeLayer && (
                    <div className="p-4 h-full">
                        <LayerStatistics 
                            layer={activeLayer} 
                            onClose={() => setSidebarView('assets')} 
                            onCategoryFilter={(key, value) => onCategoryFilter(activeLayer.id, key, value)}
                            onFeatureSelect={(feature) => {
                                onAssetSelect(activeLayer.id, feature);
                                setSidebarView('assets');
                            }}
                        />
                    </div>
                )}
            </div>
        </aside>
    );
};

export default LeftSidebar;
