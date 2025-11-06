import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonLayer } from '../types';
import type { Feature } from 'geojson';
import { area as turfArea, length as turfLength } from '@turf/turf';
import { getFeatureDisplayName } from '../utils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BASEMAPS = {
    street: {
        name: 'Street',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        icon: 'map'
    },
    satellite: {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        icon: 'satellite_alt'
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
  isMeasuring: boolean;
}

const GeoJsonRenderer: React.FC<GeoJsonRendererProps> = ({ layers, onFeatureSelect, selectedFeature, isMeasuring }) => {
  const map = useMap();
  
  return (
    <>
      {layers.map(layer => {
        if (!layer.isVisible) return null;

        const onEachFeature = (feature: Feature, mapLayer: L.Layer) => {
           if (!isMeasuring) {
                mapLayer.on({ 
                    click: (e: L.LeafletMouseEvent) => {
                    L.DomEvent.stop(e);
                    onFeatureSelect(layer, feature);
                    
                    const displayName = getFeatureDisplayName(feature);
                    
                    const container = L.DomUtil.create('div', 'font-display text-slate-800');
                    
                    const header = L.DomUtil.create('h3', 'text-lg font-bold text-slate-900 mb-2 border-b border-slate-200 pb-2', container);
                    header.innerText = displayName;

                    const detailsContainerWrapper = L.DomUtil.create('div', 'space-y-2 text-sm max-h-64 overflow-y-auto pr-2 -mr-2 pt-2', container);
                    
                    const createDetailRow = (label: string, value: string, valueClass = 'text-slate-800') => {
                        const row = L.DomUtil.create('div', 'flex justify-between items-start gap-4', detailsContainerWrapper);
                        const labelEl = L.DomUtil.create('span', 'font-medium text-slate-500 shrink-0', row);
                        labelEl.innerText = label;
                        const valueEl = L.DomUtil.create('span', `font-semibold ${valueClass} text-right break-words`, row);
                        valueEl.innerText = value;
                    };
                    
                    if (feature.properties) {
                        const propertiesToShow = Object.entries(feature.properties)
                            .filter(([key]) => !['Name', 'name', 'fid', 'Shape_Length', 'Shape_Area', 'Bldg_Id', 'Link'].includes(key))
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
           }

          const displayName = getFeatureDisplayName(feature);
          mapLayer.bindTooltip(displayName, {
            permanent: false,
            direction: 'top',
            className: 'bg-white text-slate-800 border border-slate-200 rounded-md shadow-lg px-2 py-1 text-xs',
            offset: L.point(0, -10),
          });
        };

        const style = (feature?: Feature): L.PathOptions => {
          const isSelected = !!(
            selectedFeature &&
            feature &&
            feature.properties &&
            selectedFeature.layer.id === layer.id &&
            selectedFeature.feature.properties?.fid === feature.properties.fid
          );
          return {
            color: isSelected ? '#3b82f6' : layer.color,
            weight: isSelected ? 3 : 2,
            opacity: layer.strokeOpacity,
            dashArray: layer.dashArray,
            fillColor: isSelected ? '#3b82f6' : layer.color,
            fillOpacity: isSelected ? 0.7 : layer.fillOpacity,
          };
        };
        
        const selectedId = selectedFeature ? `${selectedFeature.layer.id}-${selectedFeature.feature.properties?.fid}` : 'none';
        const key = `${layer.id}-${layer.isVisible}-${layer.color}-${layer.strokeOpacity}-${layer.fillOpacity}-${layer.dashArray}-${layer.data.features.length}-${selectedId}-${isMeasuring}`;

        return (
          <GeoJSON
            key={key}
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

type DistanceUnit = 'm' | 'km' | 'ft' | 'mi';
type AreaUnit = 'm²' | 'km²' | 'ha' | 'ft²' | 'acres';

const DISTANCE_UNITS: Record<DistanceUnit, { label: string; conversion: number; format: (val: number) => string; }> = {
  m: { label: 'Meters', conversion: 1, format: (val) => `${val.toFixed(0)} m` },
  km: { label: 'Kilometers', conversion: 0.001, format: (val) => `${val.toFixed(2)} km` },
  ft: { label: 'Feet', conversion: 3.28084, format: (val) => `${val.toFixed(0)} ft` },
  mi: { label: 'Miles', conversion: 0.000621371, format: (val) => `${val.toFixed(2)} mi` },
};

const AREA_UNITS: Record<AreaUnit, { label: string; conversion: number; format: (val: number) => string; }> = {
  'm²': { label: 'Square Meters', conversion: 1, format: (val) => `${val.toFixed(0)} m²` },
  'km²': { label: 'Square Kilometers', conversion: 0.000001, format: (val) => `${val.toFixed(3)} km²` },
  ha: { label: 'Hectares', conversion: 0.0001, format: (val) => `${val.toFixed(3)} ha` },
  'ft²': { label: 'Square Feet', conversion: 10.7639, format: (val) => `${val.toFixed(0)} ft²` },
  acres: { label: 'Acres', conversion: 0.000247105, format: (val) => `${val.toFixed(3)} acres` },
};

// --- Colorful SVG Icons ---
const ZoomInIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500 group-hover:text-blue-600 transition-colors">
        <path d="M12 5V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const ZoomOutIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-500 group-hover:text-purple-600 transition-colors">
        <path d="M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const LayersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#34D399" fillOpacity="0.8"/>
        <path d="M2 12L12 17L22 12L12 7L2 12Z" fill="#3B82F6" fillOpacity="0.8"/>
        <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="#FBBF24" fillOpacity="0.8"/>
    </svg>
);
const MeasureDistanceIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="18" r="2" stroke="#10B981" strokeWidth="2"/>
        <circle cx="18" cy="6" r="2" stroke="#10B981" strokeWidth="2"/>
        <path d="M8 16L16 8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
    </svg>
);
const MeasureAreaIcon = () => (
     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3H21V21H3V3Z" fill="#F97316" fillOpacity="0.2" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const DeleteIcon = () => (
     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H5H21" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
// --- End Icons ---


interface MapControlsProps {
    map: L.Map | null;
    measureMode: 'distance' | 'area' | null;
    setMeasureMode: (mode: 'distance' | 'area' | null) => void;
    distanceUnit: DistanceUnit;
    setDistanceUnit: (unit: DistanceUnit) => void;
    areaUnit: AreaUnit;
    setAreaUnit: (unit: AreaUnit) => void;
}

const MapControls: React.FC<MapControlsProps> = ({ map, measureMode, setMeasureMode, distanceUnit, setDistanceUnit, areaUnit, setAreaUnit }) => {
    const [isMeasurePanelOpen, setMeasurePanelOpen] = useState(false);
    const [points, setPoints] = useState<L.LatLng[]>([]);
    const pointsRef = useRef<L.LatLng[]>([]);
    const [isUnitSelectorOpen, setUnitSelectorOpen] = useState(false);
    const unitDropdownRef = useRef<HTMLDivElement>(null);
    
    const measureLayersRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
    const tempLayerRef = useRef<L.Layer | null>(null);
    const tooltipRef = useRef<L.Tooltip | null>(null);

    const formatDistance = useCallback((meters: number) => {
        const unitConfig = DISTANCE_UNITS[distanceUnit];
        const convertedValue = meters * unitConfig.conversion;
        return unitConfig.format(convertedValue);
    }, [distanceUnit]);

    const formatArea = useCallback((sqMeters: number) => {
        const unitConfig = AREA_UNITS[areaUnit];
        const convertedValue = sqMeters * unitConfig.conversion;
        return unitConfig.format(convertedValue);
    }, [areaUnit]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
                setUnitSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!map) return;
        const layerGroup = measureLayersRef.current;
        map.addLayer(layerGroup);
        return () => {
            map.removeLayer(layerGroup);
        };
    }, [map]);
    
    const clearInProgressMeasurement = useCallback(() => {
        pointsRef.current = [];
        setPoints([]);
        if (map && tempLayerRef.current) {
            map.removeLayer(tempLayerRef.current);
            tempLayerRef.current = null;
        }
        if (map && tooltipRef.current) {
            if (measureMode) {
                const initialText = `<div class="text-center">
                    <span class="measure-value">Measure ${measureMode === 'distance' ? 'Distance' : 'Area'}</span>
                    <hr class="measure-separator">
                    <span class="measure-instructions">Click on the map to start</span>
                </div>`;
                tooltipRef.current.setContent(initialText);
            } else {
                map.removeLayer(tooltipRef.current);
                tooltipRef.current = null;
            }
        }
    }, [map, measureMode]);

    const finalizeMeasurement = useCallback((finalPoints: L.LatLng[]) => {
        if (!map || !measureMode) return;

        let pointsToUse = [...finalPoints];
        if (pointsToUse.length > 1) {
            const p1 = pointsToUse[pointsToUse.length - 1];
            const p2 = pointsToUse[pointsToUse.length - 2];
            if (p1.equals(p2)) {
                pointsToUse.pop();
            }
        }

        if (measureMode === 'distance' && pointsToUse.length < 2) return;
        if (measureMode === 'area' && pointsToUse.length < 3) return;

        let finalShape: L.Polyline | L.Polygon;
        let measurementText = '';

        if (measureMode === 'distance') {
            finalShape = L.polyline(pointsToUse, { color: '#3b82f6', weight: 3 }).addTo(measureLayersRef.current);
            const line = { type: 'LineString', coordinates: pointsToUse.map(p => [p.lng, p.lat]) };
            const length = turfLength(line as any, { units: 'meters' });
            measurementText = formatDistance(length);
        } else if (measureMode === 'area') {
            finalShape = L.polygon(pointsToUse, { color: '#3b82f6', weight: 3, fillOpacity: 0.2 }).addTo(measureLayersRef.current);
            const polyCoords = [...pointsToUse.map(p => [p.lng, p.lat]), [pointsToUse[0].lng, pointsToUse[0].lat]];
            const polygon = { type: 'Polygon', coordinates: [polyCoords] };
            const area = turfArea(polygon as any);
            measurementText = formatArea(area);
        } else {
            return;
        }

        finalShape.bindTooltip(measurementText, {
            permanent: true,
            direction: 'center',
            className: 'measure-result-tooltip'
        }).openTooltip();
        
        clearInProgressMeasurement();
    }, [map, measureMode, formatDistance, formatArea, clearInProgressMeasurement]);
    
    const clearAllMeasurements = useCallback(() => {
        measureLayersRef.current.clearLayers();
        clearInProgressMeasurement();
    }, [clearInProgressMeasurement]);

    const startMeasure = useCallback((mode: 'distance' | 'area') => {
        clearAllMeasurements();
        setMeasureMode(mode);
    }, [clearAllMeasurements, setMeasureMode]);
    
    const toggleMeasurePanel = useCallback(() => {
        setMeasurePanelOpen(prev => {
            if (prev) { // When closing the panel
                clearAllMeasurements();
                setMeasureMode(null);
            }
            return !prev;
        });
    }, [clearAllMeasurements, setMeasureMode]);
    
    const handleMeasureButtonClick = (mode: 'distance' | 'area') => {
        if (measureMode === mode) {
            const minPoints = mode === 'distance' ? 2 : 3;
            if (pointsRef.current.length >= minPoints) {
                finalizeMeasurement(pointsRef.current);
            }
        } else {
            startMeasure(mode);
        }
    };

    useEffect(() => {
        if (!map || !measureMode) {
            if (map) (map.getContainer().style.cursor = '');
            return;
        }
        (map.getContainer().style.cursor = 'crosshair');

        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            if(tooltipRef.current) {
                 tooltipRef.current.setLatLng(e.latlng);
            } else if (map) {
                const initialText = `<div class="text-center">
                    <span class="measure-value">Measure ${measureMode === 'distance' ? 'Distance' : 'Area'}</span>
                    <hr class="measure-separator">
                    <span class="measure-instructions">Click on the map to start</span>
                </div>`;
                tooltipRef.current = L.tooltip({ permanent: true, direction: 'right', offset: [10, 0], className: 'measure-tooltip' })
                    .setLatLng(e.latlng)
                    .setContent(initialText)
                    .addTo(map);
            }
            
            if (pointsRef.current.length > 0) {
                const lastPoint = pointsRef.current[pointsRef.current.length - 1];
                if (tempLayerRef.current && map) map.removeLayer(tempLayerRef.current);
                
                let currentText = '';
                const instructionsHTML = `<span class="measure-instructions"><strong>Double-click</strong> to finish<br><strong>ESC</strong> or <strong>Right-click</strong> to cancel</span>`;
                const separatorHTML = '<hr class="measure-separator">';

                if (measureMode === 'distance') {
                    tempLayerRef.current = L.polyline([lastPoint, e.latlng], { color: '#0891b2', dashArray: '5, 5' }).addTo(map);
                    const allPoints = [...pointsRef.current, e.latlng];
                    const line = { type: 'LineString', coordinates: allPoints.map(p => [p.lng, p.lat]) };
                    const length = turfLength(line as any, { units: 'meters' });
                    const valueHTML = `<span class="measure-value">${formatDistance(length)}</span>`;
                    currentText = `${valueHTML}${separatorHTML}${instructionsHTML}`;
                } else {
                    const polyPoints = [...pointsRef.current, e.latlng];
                    tempLayerRef.current = L.polygon(polyPoints, { color: '#0891b2', dashArray: '5, 5', fill: false }).addTo(map);
                    if (polyPoints.length > 2) {
                         const polyCoords = [...polyPoints.map(p => [p.lng, p.lat]), [polyPoints[0].lng, polyPoints[0].lat]];
                         const polygon = { type: 'Polygon', coordinates: [polyCoords] };
                         const area = turfArea(polygon as any);
                         const valueHTML = `<span class="measure-value">${formatArea(area)}</span>`;
                         currentText = `${valueHTML}${separatorHTML}${instructionsHTML}`;
                    } else {
                        currentText = `<span class="measure-instructions">Click to add more points...</span>`;
                    }
                }
                if (tooltipRef.current) tooltipRef.current.setContent(currentText);
            }
        };

        const handleSingleClick = (e: L.LeafletMouseEvent) => {
            pointsRef.current.push(e.latlng);
            setPoints([...pointsRef.current]);
        };

        const handleDoubleClick = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stop(e);
            finalizeMeasurement(pointsRef.current);
        };

        const handleRightClick = (e: L.LeafletMouseEvent) => {
            L.DomEvent.stop(e);
            clearInProgressMeasurement();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearInProgressMeasurement();
            }
        };

        map.on('mousemove', handleMouseMove);
        map.on('click', handleSingleClick);
        map.on('dblclick', handleDoubleClick);
        map.on('contextmenu', handleRightClick);
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            map.off('mousemove', handleMouseMove);
            map.off('click', handleSingleClick);
            map.off('dblclick', handleDoubleClick);
            map.off('contextmenu', handleRightClick);
            document.removeEventListener('keydown', handleKeyDown);

            if (map) (map.getContainer().style.cursor = '');
            if (tooltipRef.current && map) {
                map.removeLayer(tooltipRef.current);
                tooltipRef.current = null;
            }
            clearInProgressMeasurement();
        };

    }, [map, measureMode, finalizeMeasurement, clearInProgressMeasurement, formatDistance, formatArea]);

    useEffect(() => {
        measureLayersRef.current.clearLayers();
        if (points.length > 0) {
            points.forEach(p => {
                L.circleMarker(p, { radius: 4, color: '#0891b2', fillColor: '#f8fafc', fillOpacity: 1, weight: 2 }).addTo(measureLayersRef.current);
            });
            if (measureMode === 'distance' && points.length > 1) {
                L.polyline(points, { color: '#0891b2' }).addTo(measureLayersRef.current);
            } else if (measureMode === 'area' && points.length > 1) {
                L.polygon(points, { color: '#0891b2', fillOpacity: 0.2 }).addTo(measureLayersRef.current);
            }
        }
    }, [points, measureMode]);
    
    const handleZoomIn = () => map?.zoomIn();
    const handleZoomOut = () => map?.zoomOut();

    const currentUnit = measureMode === 'distance' ? distanceUnit : areaUnit;
    const unitSet = measureMode === 'distance' ? DISTANCE_UNITS : AREA_UNITS;
    
    const controlButtonClasses = "flex size-10 items-center justify-center rounded-xl bg-white/80 backdrop-blur-md shadow-lg shadow-sky-200/50 border border-slate-200 hover:bg-sky-100/80 hover:border-sky-300 hover:shadow-sky-300/80 transition-all duration-200 ease-in-out";

    return (
         <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3 z-[1000]">
            <div className="flex flex-col rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 overflow-hidden">
                <button onClick={handleZoomIn} title="Zoom In" className="group flex size-10 items-center justify-center hover:bg-slate-100 transition-all duration-200 ease-in-out">
                    <ZoomInIcon />
                </button>
                <div className="h-px bg-slate-200"></div>
                <button onClick={handleZoomOut} title="Zoom Out" className="group flex size-10 items-center justify-center hover:bg-slate-100 transition-all duration-200 ease-in-out">
                    <ZoomOutIcon />
                </button>
            </div>
            
             <div className="flex flex-col items-end gap-2">
                {isMeasurePanelOpen && (
                    <div className="flex items-center gap-2">
                         <div className="flex gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200">
                            <button 
                                title="Measure Distance" 
                                className={`flex items-center justify-center size-9 rounded-lg transition-all ${measureMode === 'distance' ? 'bg-green-100 ring-2 ring-green-400' : 'text-slate-600 hover:bg-slate-200'}`} 
                                onClick={() => handleMeasureButtonClick('distance')}
                            >
                                <MeasureDistanceIcon />
                            </button>
                            <button 
                                title="Measure Area" 
                                className={`flex items-center justify-center size-9 rounded-lg transition-all ${measureMode === 'area' ? 'bg-orange-100 ring-2 ring-orange-400' : 'text-slate-600 hover:bg-slate-200'}`} 
                                onClick={() => handleMeasureButtonClick('area')}
                            >
                                <MeasureAreaIcon />
                            </button>
                            <div className="w-px bg-slate-200 my-1"></div>
                            <button 
                                title="Clear All Measurements" 
                                className="flex items-center justify-center size-9 rounded-lg text-slate-600 hover:bg-red-100 transition-colors" 
                                onClick={clearAllMeasurements}
                            >
                                <DeleteIcon />
                            </button>
                        </div>
                        {measureMode && (
                            <div ref={unitDropdownRef} className="relative">
                                <button
                                    onClick={() => setUnitSelectorOpen(!isUnitSelectorOpen)}
                                     className="flex items-center justify-center h-10 px-3 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                                >
                                    <span className="text-sm font-semibold">{currentUnit}</span>
                                    <span className="material-symbols-outlined text-slate-500" style={{ fontSize: '20px' }}>arrow_drop_down</span>
                                </button>
                                {isUnitSelectorOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-40 rounded-xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 p-1">
                                        {Object.entries(unitSet).map(([key, { label }]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    if (measureMode === 'distance') setDistanceUnit(key as DistanceUnit);
                                                    else setAreaUnit(key as AreaUnit);
                                                    setUnitSelectorOpen(false);
                                                }}
                                                className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${currentUnit === key ? 'bg-primary/10 text-slate-800' : 'text-slate-600 hover:bg-slate-200/50'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <button onClick={toggleMeasurePanel} title="Measurement Tools" className={controlButtonClasses}>
                    <div className="transition-transform duration-300" style={{ transform: isMeasurePanelOpen ? 'rotate(135deg)' : 'rotate(0deg)'}}>
                        {isMeasurePanelOpen ? (
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5V19" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M5 12H19" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 7V11" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M19 7V11" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M5 9L19 9" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M7 7.5L5 9L7 10.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17 7.5L19 9L17 10.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3.5 13.5H20.5C20.7761 13.5 21 13.7239 21 14V16C21 16.2761 20.7761 16.5 20.5 16.5H3.5C3.22386 16.5 3 16.2761 3 16V14C3 13.7239 3.22386 13.5 3.5 13.5Z" fill="#3B82F6" stroke="#1E293B" strokeWidth="1.5"/>
                                <path d="M6 13.5V16.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M8 13.5V15.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M10 13.5V16.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M12 13.5V15.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M14 13.5V16.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M16 13.5V15.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M18 13.5V16.5" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                        )}
                    </div>
                </button>
            </div>
        </div>
    )
}

const BasemapControl: React.FC<{ onBasemapChange: (key: string) => void, activeBasemapKey: string }> = ({ onBasemapChange, activeBasemapKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const controlButtonClasses = "flex size-10 items-center justify-center rounded-xl bg-white/80 backdrop-blur-md shadow-lg shadow-sky-200/50 border border-slate-200 hover:bg-sky-100/80 hover:border-sky-300 hover:shadow-sky-300/80 transition-all duration-200 ease-in-out";


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
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={controlButtonClasses}
                title="Change Basemap"
            >
                <LayersIcon />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 rounded-xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 p-2">
                    {Object.entries(BASEMAPS).map(([key, basemap]) => (
                        <button
                            key={key}
                            onClick={() => {
                                onBasemapChange(key);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left text-sm transition-colors ${activeBasemapKey === key ? 'bg-primary/10 text-slate-800' : 'text-slate-600 hover:bg-slate-200/50'}`}
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

const NORTH_ARROW_SVGS = [
     {
        name: 'vibrant',
        label: 'Vibrant',
        svg: (
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="size-7 transition-transform group-hover:scale-110">
                <path d="M16 12 L28 30 L16 24 L4 30 Z" fill="#f4511e" />
                <text 
                    x="16" y="9" 
                    textAnchor="middle" 
                    dominantBaseline="central" 
                    fontSize="12" 
                    fontWeight="bold" 
                    fill="#0288d1"
                    style={{ textShadow: '0 0 1px #29b6f6, 0 0 3px #29b6f6' }}
                >
                    N
                </text>
            </svg>
        )
    },
    {
        name: 'sleek',
        label: 'Sleek',
        svg: (
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-6 transition-transform group-hover:rotate-12">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 3.25L4.75 20.75L12 17L19.25 20.75L12 3.25ZM12 5.5L17.15 18.5L12 15.6L6.85 18.5L12 5.5Z" />
            </svg>
        )
    },
    {
        name: 'sharp',
        label: 'Sharp',
        svg: (
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-6 transition-transform group-hover:rotate-12">
                 <path d="M12 2L4 14H11V22H13V14H20L12 2Z" />
            </svg>
        )
    },
     {
        name: 'classic',
        label: 'Classic',
        svg: (
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-6 transition-transform group-hover:rotate-12">
                <path d="M12 2L15 9H9L12 2Z" />
                <path d="M12 22L9 15H15L12 22Z" fillOpacity="0.6"/>
                <path d="M2 12L9 15V9L2 12Z" fillOpacity="0.6"/>
                <path d="M22 12L15 9V15L22 12Z" fillOpacity="0.6"/>
                <circle cx="12" cy="12" r="1.5" className="fill-white group-hover:fill-primary/20 transition-colors"/>
            </svg>
        )
    },
    {
        name: 'compass',
        label: 'Compass',
        svg: (
             <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-6 transition-transform group-hover:rotate-12">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z" />
                <path d="M12 5L15 12H9L12 5Z" />
            </svg>
        )
    }
];

const NorthArrowControl: React.FC<{ 
    onResetView: () => void,
    selectedIcon: string,
    onIconChange: (iconName: string) => void
}> = ({ onResetView, selectedIcon, onIconChange }) => {
    const [isSelectorOpen, setSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const selectedIconData = NORTH_ARROW_SVGS.find(icon => icon.name === selectedIcon) || NORTH_ARROW_SVGS[0];
    const controlButtonClasses = "flex size-10 items-center justify-center rounded-xl bg-white/80 backdrop-blur-md shadow-lg shadow-sky-200/50 border border-slate-200 hover:bg-sky-100/80 hover:border-sky-300 hover:shadow-sky-300/80 transition-all duration-200 ease-in-out";

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setSelectorOpen(prev => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={selectorRef} className="relative group">
            <button
                onClick={onResetView}
                onContextMenu={handleRightClick}
                className={controlButtonClasses}
                title="Reset View (Right-click to change icon)"
            >
                {selectedIconData.svg}
            </button>
            {isSelectorOpen && (
                 <div className="absolute top-full right-0 mt-2 w-auto rounded-xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200">
                     <div className="north-arrow-selector">
                        {NORTH_ARROW_SVGS.map(icon => (
                            <button
                                key={icon.name}
                                title={icon.label}
                                onClick={() => {
                                    onIconChange(icon.name);
                                    setSelectorOpen(false);
                                }}
                                className={`north-arrow-selector-btn ${selectedIcon === icon.name ? 'active' : ''}`}
                            >
                                {icon.svg}
                            </button>
                        ))}
                     </div>
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
  const [activeBasemapKey, setActiveBasemapKey] = useState<string>('street');
  const [measureMode, setMeasureMode] = useState<'distance' | 'area' | null>(null);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('m');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('m²');
  const [northArrowIcon, setNorthArrowIcon] = useState<string>(NORTH_ARROW_SVGS[0].name);

  useEffect(() => {
    const savedIcon = localStorage.getItem('northArrowIcon');
    const isValidIcon = NORTH_ARROW_SVGS.some(icon => icon.name === savedIcon);
    if (savedIcon && isValidIcon) {
        setNorthArrowIcon(savedIcon);
    }
  }, []);
  
  const handleNorthArrowIconChange = (iconName: string) => {
    setNorthArrowIcon(iconName);
    localStorage.setItem('northArrowIcon', iconName);
  }

  const activeBasemap = BASEMAPS[activeBasemapKey as keyof typeof BASEMAPS];
  
  const handleResetView = () => {
    if (map) {
        map.flyTo(center, zoom);
    }
  };

  return (
    <div className="relative flex-1 h-full rounded-xl overflow-hidden shadow-sm border border-slate-200">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} zoomControl={false} ref={setMap} doubleClickZoom={false}>
        <TileLayer
          key={activeBasemapKey}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
        />
        <MapUpdater boundsToFit={boundsToFit} />
        <GeoJsonRenderer layers={layers} onFeatureSelect={onFeatureSelect} selectedFeature={selectedFeature} isMeasuring={!!measureMode} />
      </MapContainer>
        
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
            <NorthArrowControl 
                onResetView={handleResetView} 
                selectedIcon={northArrowIcon}
                onIconChange={handleNorthArrowIconChange}
            />
            <BasemapControl activeBasemapKey={activeBasemapKey} onBasemapChange={setActiveBasemapKey} />
        </div>
        
        <MapControls 
            map={map}
            measureMode={measureMode} 
            setMeasureMode={setMeasureMode}
            distanceUnit={distanceUnit}
            setDistanceUnit={setDistanceUnit}
            areaUnit={areaUnit}
            setAreaUnit={setAreaUnit}
        />
    </div>
  );
};

export default MapWrapper;