import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonLayer } from '../types';
import type { Feature } from 'geojson';
import { area } from '@turf/turf';
import { getFeatureDisplayName, getFeatureStatus } from '../utils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASEMAPS = {
    satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        icon: 'satellite_alt'
    },
    street: {
        name: 'Street',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        icon: 'map'
    },
    topo: {
        name: 'Topographic',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        icon: 'terrain'
    }
};

interface GeoJsonRendererProps {
  layers: GeoJsonLayer[];
  onFeatureSelect: (layer: GeoJsonLayer, feature: Feature) => void;
  selectedFeature: { layer: GeoJsonLayer; feature: Feature } | null;
}

const GeoJsonRenderer: React.FC<GeoJsonRendererProps> = ({ layers, onFeatureSelect, selectedFeature }) => {
  const map = useMap();
  const selectedFeatureId = useMemo(() => {
    if (!selectedFeature) return null;
    return getFeatureDisplayName(selectedFeature.feature) + selectedFeature.layer.id;
  }, [selectedFeature]);

  return (
    <>
      {layers.map(layer => {
        if (!layer.isVisible) return null;

        const onEachFeature = (feature: Feature, mapLayer: L.Layer) => {
           mapLayer.on({ 
            click: (e: L.LeafletMouseEvent) => {
              const displayName = getFeatureDisplayName(feature);
              const { status, color: statusColorClass } = getFeatureStatus(feature);
              
              let featureArea = 0;
              try {
                  if (feature.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                      featureArea = area(feature);
                  }
              } catch (err) { console.warn("Could not calculate area:", err) }
              const formattedArea = featureArea > 0 ? `${featureArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq. m` : 'N/A';

              const container = L.DomUtil.create('div', 'font-display text-gray-200');
              
              const header = L.DomUtil.create('h3', 'text-lg font-bold text-white mb-2 border-b border-slate-700 pb-2', container);
              header.innerText = displayName;

              const detailsContainerWrapper = L.DomUtil.create('div', 'space-y-2 text-sm max-h-64 overflow-y-auto pr-2 -mr-2', container);
              
              const createDetailRow = (label: string, value: string, valueClass = 'text-gray-200') => {
                const row = L.DomUtil.create('div', 'flex justify-between items-start gap-4', detailsContainerWrapper);
                const labelEl = L.DomUtil.create('span', 'font-medium text-slate-400 shrink-0', row);
                labelEl.innerText = label;
                const valueEl = L.DomUtil.create('span', `font-semibold ${valueClass} text-right break-words`, row);
                valueEl.innerText = value;
              };
              
              createDetailRow('Status', status, statusColorClass);
              createDetailRow('Asset Type', layer.name);
              createDetailRow('Area', formattedArea);
              
              if (feature.properties) {
                const separator = L.DomUtil.create('div', 'border-t border-slate-700 my-2', detailsContainerWrapper);
                const propertiesToShow = Object.entries(feature.properties)
                    .filter(([key]) => !['Name', 'name', 'Status', 'fid', 'Shape_Length', 'Shape_Area', 'Bldg_Id', 'Link'].includes(key))
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

                for (const [key, value] of propertiesToShow) {
                    if (value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== " ") {
                        createDetailRow(key, String(value));
                    }
                }
              }

              L.popup({
                className: 'custom-leaflet-popup',
                minWidth: 300,
                maxWidth: 350,
              })
              .setLatLng(e.latlng)
              .setContent(container)
              .openOn(map);
            }
          });

          const displayName = getFeatureDisplayName(feature);
          mapLayer.bindTooltip(displayName, {
            permanent: false,
            direction: 'top',
            className: 'bg-slate-800 text-white border-none rounded-md shadow-lg px-2 py-1 text-xs',
            offset: L.point(0, -10),
          });
        };

        const style = (feature?: Feature): L.PathOptions => {
          const isSelected = !!(feature && selectedFeatureId === getFeatureDisplayName(feature) + layer.id);
          return {
            color: isSelected ? '#3b82f6' : layer.color, // primary for selected
            weight: isSelected ? 3 : 1.5,
            opacity: 1,
            fillColor: isSelected ? '#3b82f6' : layer.color,
            fillOpacity: isSelected ? 0.7 : 0.4,
          };
        };
        
        return (
          <GeoJSON
            key={`${layer.id}-${layer.isVisible}-${layer.color}-${layer.data.features.length}`}
            data={layer.data}
            style={style}
            onEachFeature={onEachFeature}
          />
        );
      })}
    </>
  );
};

interface MapUpdaterProps {
  boundsToFit: L.LatLngBounds | null;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ boundsToFit }) => {
  const map = useMap();
  useEffect(() => {
    if (boundsToFit && boundsToFit.isValid()) {
      map.flyToBounds(boundsToFit, { padding: [50, 50], maxZoom: 18, duration: 1 });
    }
  }, [boundsToFit, map]);
  return null;
};

const MapControls: React.FC<{map: L.Map | null}> = ({ map }) => {
    const handleZoomIn = () => map?.zoomIn();
    const handleZoomOut = () => map?.zoomOut();
    const handleRecenter = () => {
        if(map) {
            map.locate({setView: true, maxZoom: 16});
        }
    }
    return (
         <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3 z-[1000]">
            <div className="flex flex-col gap-0.5">
                <button onClick={handleZoomIn} className="flex size-10 items-center justify-center rounded-t-lg bg-slate-900/80 backdrop-blur-sm shadow-md text-gray-200 hover:bg-slate-800/80">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>add</span>
                </button>
                <button onClick={handleZoomOut} className="flex size-10 items-center justify-center rounded-b-lg bg-slate-900/80 backdrop-blur-sm shadow-md text-gray-200 hover:bg-slate-800/80">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>remove</span>
                </button>
            </div>
            <button onClick={handleRecenter} className="flex size-10 items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-sm shadow-md text-gray-200 hover:bg-slate-800/80">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>my_location</span>
            </button>
        </div>
    )
}

const BasemapControl: React.FC<{ onBasemapChange: (key: string) => void, activeBasemapKey: string }> = ({ onBasemapChange, activeBasemapKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="absolute top-4 right-4 z-[1000]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex size-10 items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-sm shadow-md text-gray-200 hover:bg-slate-800/80 transition-colors"
                title="Change Basemap"
            >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>layers</span>
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 rounded-lg bg-slate-900/80 backdrop-blur-sm shadow-lg border border-slate-700 p-2">
                    {Object.entries(BASEMAPS).map(([key, basemap]) => (
                        <button
                            key={key}
                            onClick={() => {
                                onBasemapChange(key);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${activeBasemapKey === key ? 'bg-primary/20 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{basemap.icon}</span>
                            <span>{basemap.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

interface MapWrapperProps {
  center: [number, number];
  zoom: number;
  layers: GeoJsonLayer[];
  boundsToFit: L.LatLngBounds | null;
  onFeatureSelect: (layer: GeoJsonLayer, feature: Feature) => void;
  selectedFeature: { layer: GeoJsonLayer; feature: Feature } | null;
}

const MapWrapper: React.FC<MapWrapperProps> = ({ center, zoom, layers, boundsToFit, onFeatureSelect, selectedFeature }) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeBasemapKey, setActiveBasemapKey] = useState<string>('satellite');

  const activeBasemap = BASEMAPS[activeBasemapKey as keyof typeof BASEMAPS];
  
  return (
    <div className="relative flex-1 h-full rounded-xl overflow-hidden shadow-sm">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} zoomControl={false} ref={setMap}>
        <TileLayer
          key={activeBasemapKey}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
        />
        <MapUpdater boundsToFit={boundsToFit} />
        <GeoJsonRenderer layers={layers} onFeatureSelect={onFeatureSelect} selectedFeature={selectedFeature} />
      </MapContainer>
        <MapControls map={map} />
        <BasemapControl activeBasemapKey={activeBasemapKey} onBasemapChange={setActiveBasemapKey} />
    </div>
  );
};

export default MapWrapper;