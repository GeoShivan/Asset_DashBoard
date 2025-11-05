import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import L from 'leaflet';
import { bbox } from '@turf/turf';

import LeftSidebar from './components/ControlPanel';
import MapWrapper from './components/MapWrapper';
import AssetDetailsPanel from './components/FeatureInspector';
import type { GeoJsonLayer } from './types';
import { getFeatureDisplayName } from './utils';

const Header: React.FC = () => (
    <header className="flex shrink-0 items-center justify-between whitespace-nowrap border-b border-slate-800 bg-slate-900 px-6 py-3 z-10">
        <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 text-white">
                <div className="size-8 text-primary">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_6_543)">
                            <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                            <path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z" fill="currentColor" fillRule="evenodd"></path>
                        </g>
                        <defs><clipPath id="clip0_6_543"><rect fill="white" height="48" width="48"></rect></clipPath></defs>
                    </svg>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">GeoAsset Dashboard</h2>
            </div>
            <div className="flex items-center gap-9 text-slate-300">
                <a className="text-sm font-medium leading-normal text-primary" href="#">Dashboard</a>
            </div>
        </div>
        <div className="flex flex-1 justify-end gap-4">
            <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 w-10 bg-slate-800 text-slate-300 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
            </button>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/a/ACg8ocK_gS2g_2YUN2a-wYp5c_NslloT2Sg_Nl4K6s5i-w=s96-c")` }}></div>
        </div>
    </header>
);

const App: React.FC = () => {
    const [layers, setLayers] = useState<GeoJsonLayer[]>([]);
    const [activeLayerTab, setActiveLayerTab] = useState<string>('Buildings');
    const [sidebarView, setSidebarView] = useState<'assets' | 'statistics'>('assets');
    const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
        'Buildings': true,
        'Horticulture': true,
        'Roads': false,
    });
    const [selectedAsset, setSelectedAsset] = useState<{ layerId: string; feature: Feature } | null>(null);
    const [boundsToFit, setBoundsToFit] = useState<L.LatLngBounds | null>(null);
    const [assetSearchTerm, setAssetSearchTerm] = useState('');
    const [propertySearchKey, setPropertySearchKey] = useState('');
    const [propertySearchValue, setPropertySearchValue] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [buildingResponse, horticultureResponse] = await Promise.all([
                    fetch('/data/Building.json'),
                    fetch('/data/horticulture-area.json')
                ]);

                if (!buildingResponse.ok || !horticultureResponse.ok) {
                    throw new Error('Failed to fetch initial GeoJSON data');
                }

                const buildingData = await buildingResponse.json() as FeatureCollection;
                const horticultureData = await horticultureResponse.json() as FeatureCollection;
                
                const initialLayers: GeoJsonLayer[] = [
                    { id: 'buildings-1', name: 'Buildings', data: buildingData, isVisible: true, color: '#f97316', strokeOpacity: 1, fillOpacity: 0.5, dashArray: '' },
                    { id: 'horticulture-1', name: 'Horticulture', data: horticultureData, isVisible: true, color: '#22c55e', strokeOpacity: 1, fillOpacity: 0.5, dashArray: '' },
                    { id: 'roads-1', name: 'Roads', data: { type: 'FeatureCollection', features: [] }, isVisible: false, color: '#64748b', strokeOpacity: 1, fillOpacity: 0.5, dashArray: '' },
                ];
                
                setLayers(initialLayers);

                if (buildingData.features.length > 0) {
                  const firstBuildingLayer = initialLayers.find(l => l.name === 'Buildings');
                  if(firstBuildingLayer) {
                    setSelectedAsset({ layerId: firstBuildingLayer.id, feature: buildingData.features[0] });
                  }
                }
                
                const combinedData: FeatureCollection = {
                    type: 'FeatureCollection',
                    features: [...buildingData.features, ...horticultureData.features]
                };
                
                if (combinedData.features.length > 0) {
                    const [minX, minY, maxX, maxY] = bbox(combinedData);
                    setBoundsToFit(L.latLngBounds(L.latLng(minY, minX), L.latLng(maxY, maxX)));
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
            }
        };

        loadInitialData();
    }, []);

    const handleVisibilityChange = useCallback((layerName: string, isVisible: boolean) => {
        setLayerVisibility(prev => ({ ...prev, [layerName]: isVisible }));
        setLayers(prev => prev.map(l => l.name === layerName ? { ...l, isVisible } : l));
    }, []);

    const handleAssetSelect = useCallback((layerId: string, feature: Feature) => {
      if (selectedAsset && selectedAsset.layerId === layerId && getFeatureDisplayName(selectedAsset.feature) === getFeatureDisplayName(feature)) {
        // do nothing if same asset is clicked
      } else {
        setSelectedAsset({ layerId, feature });
        try {
            const [minX, minY, maxX, maxY] = bbox(feature);
            setBoundsToFit(L.latLngBounds(L.latLng(minY, minX), L.latLng(maxY, maxX)));
        } catch (e) {
            console.error("Could not calculate bounds for feature:", e);
        }
      }
    }, [selectedAsset]);

    const assetList = useMemo(() => {
        let list = layers
            .filter(layer => layerVisibility[layer.name])
            .flatMap(layer => layer.data.features.map(feature => ({
                layerId: layer.id,
                feature,
                layerName: layer.name,
                layerColor: layer.color
            })));
        
        // Apply property search first
        if (propertySearchKey.trim() && propertySearchValue.trim()) {
            const lowerKey = propertySearchKey.toLowerCase().trim();
            const lowerValue = propertySearchValue.toLowerCase().trim();
            list = list.filter(asset => {
                if (!asset.feature.properties) return false;
                
                const matchingPropKey = Object.keys(asset.feature.properties).find(k => k.toLowerCase() === lowerKey);

                if (matchingPropKey) {
                    const propValue = asset.feature.properties[matchingPropKey];
                    if (propValue !== null && propValue !== undefined) {
                        return String(propValue).toLowerCase().includes(lowerValue);
                    }
                }
                return false;
            });
        }

        // Then apply general search
        if (assetSearchTerm.trim()) {
            const lowercasedFilter = assetSearchTerm.toLowerCase();
            list = list.filter(asset => {
                const displayName = getFeatureDisplayName(asset.feature).toLowerCase();
                const id = (asset.feature.properties?.fid || '').toString().toLowerCase();
                return displayName.includes(lowercasedFilter) || id.includes(lowercasedFilter);
            });
        }

        return list;
    }, [layers, layerVisibility, assetSearchTerm, propertySearchKey, propertySearchValue]);
    
    const displayedAsset = useMemo(() => {
        if (!selectedAsset) return null;
        const layer = layers.find(l => l.id === selectedAsset.layerId);
        if (!layer) return null;
        return {
            layer,
            feature: selectedAsset.feature
        }
    }, [selectedAsset, layers]);

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden">
            <Header />
            <div className="flex h-full min-h-0 flex-1">
                <LeftSidebar
                    layers={layers}
                    activeLayerTab={activeLayerTab}
                    setActiveLayerTab={setActiveLayerTab}
                    layerVisibility={layerVisibility}
                    onVisibilityChange={handleVisibilityChange}
                    assets={assetList}
                    selectedAsset={selectedAsset}
                    onAssetSelect={handleAssetSelect}
                    assetSearchTerm={assetSearchTerm}
                    onAssetSearchChange={setAssetSearchTerm}
                    propertySearchKey={propertySearchKey}
                    onPropertySearchKeyChange={setPropertySearchKey}
                    propertySearchValue={propertySearchValue}
                    onPropertySearchValueChange={setPropertySearchValue}
                    sidebarView={sidebarView}
                    setSidebarView={setSidebarView}
                />
                <main className="flex flex-1 flex-col bg-background-dark p-4">
                    <MapWrapper
                        center={[13.267, 80.329]}
                        zoom={15}
                        layers={layers}
                        boundsToFit={boundsToFit}
                        onFeatureSelect={(layer, feature) => handleAssetSelect(layer.id, feature)}
                        selectedFeature={displayedAsset}
                    />
                </main>
                {displayedAsset && (
                    <AssetDetailsPanel
                        layer={displayedAsset.layer}
                        feature={displayedAsset.feature}
                        onClose={() => setSelectedAsset(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default App;