import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonLayer } from '../types';
import type { Feature } from 'geojson';
import { getFeatureDisplayName } from '../utils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeoJsonRendererProps {
  layers: GeoJsonLayer[];
  onFeatureSelect: (layer: GeoJsonLayer, feature: Feature) => void;
  selectedFeature: { layer: GeoJsonLayer; feature: Feature } | null;
}

const GeoJsonRenderer: React.FC<GeoJsonRendererProps> = ({ layers, onFeatureSelect, selectedFeature }) => {
  const selectedFeatureId = useMemo(() => {
    if (!selectedFeature) return null;
    return getFeatureDisplayName(selectedFeature.feature) + selectedFeature.layer.id;
  }, [selectedFeature]);

  return (
    <>
      {layers.map(layer => {
        if (!layer.isVisible) return null;

        const onEachFeature = (feature: Feature, mapLayer: L.Layer) => {
          mapLayer.on({ click: () => onFeatureSelect(layer, feature) });
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
            fillColor: layer.color,
            fillOpacity: isSelected ? 0.7 : 0.4,
          };
        };
        
        return (
          <GeoJSON
            key={`${layer.id}-${selectedFeatureId}-${layer.isVisible}-${layer.color}-${layer.data.features.length}`}
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

interface MapWrapperProps {
  center: [number, number];
  zoom: number;
  layers: GeoJsonLayer[];
  boundsToFit: L.LatLngBounds | null;
  onFeatureSelect: (layer: GeoJsonLayer, feature: Feature) => void;
  selectedFeature: { layer: GeoJsonLayer; feature: Feature } | null;
}

const MapWrapper: React.FC<MapWrapperProps> = ({ center, zoom, layers, boundsToFit, onFeatureSelect, selectedFeature }) => {
  // Fix: Add useState to component state.
  const [map, setMap] = useState<L.Map | null>(null);
  
  return (
    <div className="relative flex-1 h-full rounded-xl overflow-hidden shadow-sm">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} zoomControl={false} ref={setMap}>
        <TileLayer
          attribution='Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <MapUpdater boundsToFit={boundsToFit} />
        <GeoJsonRenderer layers={layers} onFeatureSelect={onFeatureSelect} selectedFeature={selectedFeature} />
      </MapContainer>
        <MapControls map={map} />
    </div>
  );
};

export default MapWrapper;
