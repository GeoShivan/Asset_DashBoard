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
    assets: Asset[];
    selectedAsset: { layerId: string; feature: Feature } | null;
    onAssetSelect: (layerId: string, feature: Feature) => void;
    assetSearchTerm: string;
    onAssetSearchChange: (term: string) => void;
    propertySearchKey: string;
    onPropertySearchKeyChange: (key: string) => void;
    propertySearchValue: string;
    onPropertySearchValueChange: (value: string) => void;
    sidebarView: 'assets' | 'statistics';
    setSidebarView: (view: 'assets' | 'statistics') => void;
}

const layerIcons: Record<string, string> = {
    'Buildings': 'apartment',
    'Horticulture': 'local_florist',
    'Roads': 'road',
};

const layerIconColors: Record<string, string> = {
    'Buildings': 'text-orange-400',
    'Horticulture': 'text-green-400',
    'Roads': 'text-slate-400',
};

const AssetCard: React.FC<{ asset: Asset; isSelected: boolean; onSelect: () => void; }> = ({ asset, isSelected, onSelect }) => {
    const { status, color } = getFeatureStatus(asset.feature);
    const displayName = getFeatureDisplayName(asset.feature);
    
    const borderStyle = { borderLeft: `3px solid ${asset.layerColor}` };

    return (
        <div 
            onClick={onSelect}
            style={borderStyle}
            className={`flex flex-col gap-1 p-3 rounded-md cursor-pointer transition-all ${isSelected ? 'bg-primary/20' : 'bg-slate-800/50 hover:bg-slate-800'}`}
        >
            <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-white truncate pr-2" title={displayName}>{displayName}</p>
                <span className="text-xs font-medium text-slate-300 bg-slate-700/80 px-2 py-0.5 rounded-full shrink-0">{asset.layerName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
                <p className="text-slate-400">ID: {asset.feature.properties?.fid || 'N/A'}</p>
                <p className={`font-medium ${color}`}>{status}</p>
            </div>
        </div>
    );
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    layers, activeLayerTab, setActiveLayerTab, layerVisibility, onVisibilityChange, 
    assets, selectedAsset, onAssetSelect, assetSearchTerm, onAssetSearchChange,
    propertySearchKey, onPropertySearchKeyChange, propertySearchValue, onPropertySearchValueChange,
    sidebarView, setSidebarView,
}) => {
    const activeLayer = layers.find(l => l.name === activeLayerTab);
    
    return (
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
            <div className="p-4 space-y-6 shrink-0">
                <div>
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-2 text-white">Layers</h3>
                    <div className="flex flex-col gap-1 mt-3 px-2 text-slate-200">
                        {layers.map(layer => (
                            <div 
                                key={layer.id}
                                onClick={() => {
                                    setActiveLayerTab(layer.name);
                                    setSidebarView('assets');
                                }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${activeLayerTab === layer.name ? 'bg-primary/20 text-white' : 'hover:bg-slate-800/50'}`}
                            >
                                <span className={`material-symbols-outlined ${layerIconColors[layer.name] || 'text-slate-400'}`} style={{ fontSize: '24px' }}>{layerIcons[layer.name] || 'layers'}</span>
                                <p className={`text-sm font-medium leading-normal`}>{layer.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] px-2 text-white">Layer Visibility</h3>
                    <div className="px-2 mt-3">
                        {layers.map(layer => (
                             <label key={layer.id} className="flex gap-x-3 py-2 flex-row items-center">
                                <input 
                                    checked={layerVisibility[layer.name] ?? false} 
                                    onChange={(e) => onVisibilityChange(layer.name, e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-600 border-2 bg-transparent text-primary checked:bg-primary checked:border-primary checked:bg-[image:var(--checkbox-tick-svg)] focus:ring-0 focus:ring-offset-0 focus:border-slate-600 focus:outline-none" 
                                    type="checkbox"
                                />
                                <p className="text-sm font-normal leading-normal">{layer.name}</p>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col min-h-0 border-t border-slate-800 flex-1">
                {sidebarView === 'assets' && (
                    <div className="p-4 flex flex-col gap-4 h-full">
                        <div className="px-2 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold leading-tight tracking-[-0.015em] text-white">Assets ({assets.length})</h3>
                             <button 
                                onClick={() => setSidebarView('statistics')} 
                                title="Analyze Layer"
                                disabled={!activeLayer || activeLayer.data.features.length === 0}
                                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white disabled:text-slate-600 disabled:bg-transparent disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>bar_chart</span>
                            </button>
                        </div>

                        <div className="px-2 space-y-3 shrink-0">
                            <label className="flex flex-col min-w-40 !h-10 max-w-full">
                                <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-800">
                                    <div className="text-slate-400 flex items-center justify-center pl-3">
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                                    </div>
                                    <input 
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-slate-400 px-2 text-sm font-normal leading-normal" 
                                        placeholder="Search by name or ID..." 
                                        value={assetSearchTerm}
                                        onChange={(e) => onAssetSearchChange(e.target.value)}
                                    />
                                </div>
                            </label>
                            
                            <div>
                                <p className="text-xs text-slate-400 mb-1.5">Filter by property</p>
                                <div className="flex gap-2">
                                    <input 
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-slate-800 h-9 placeholder:text-slate-400 px-3 text-sm font-normal leading-normal" 
                                        placeholder="Property Name"
                                        value={propertySearchKey}
                                        onChange={(e) => onPropertySearchKeyChange(e.target.value)}
                                    />
                                    <input 
                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-slate-800 h-9 placeholder:text-slate-400 px-3 text-sm font-normal leading-normal" 
                                        placeholder="Value"
                                        value={propertySearchValue}
                                        onChange={(e) => onPropertySearchValueChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 px-2 flex-1 overflow-y-auto -mr-4 pr-3 pt-2 pb-2">
                           {assets.map((asset, index) => (
                                <AssetCard 
                                    key={`${asset.layerId}-${asset.feature.properties?.fid || index}`} 
                                    asset={asset}
                                    isSelected={selectedAsset?.layerId === asset.layerId && getFeatureDisplayName(selectedAsset.feature) === getFeatureDisplayName(asset.feature)}
                                    onSelect={() => onAssetSelect(asset.layerId, asset.feature)}
                                />
                           ))}
                        </div>
                    </div>
                )}
                 {sidebarView === 'statistics' && activeLayer && (
                    <div className="p-4 h-full">
                        <LayerStatistics layer={activeLayer} onClose={() => setSidebarView('assets')} />
                    </div>
                )}
            </div>
        </aside>
    );
};

export default LeftSidebar;