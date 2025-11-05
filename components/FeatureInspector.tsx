import React, { useMemo } from 'react';
import { area } from '@turf/turf';
import type { GeoJsonLayer } from '../types';
import type { Feature } from 'geojson';
import { getFeatureDisplayName, getFeatureStatus } from '../utils';

interface AssetDetailsPanelProps {
  feature: Feature | null | undefined;
  layer: GeoJsonLayer | null | undefined;
  onClose: () => void;
}

const AssetDetailsPanel: React.FC<AssetDetailsPanelProps> = ({ feature, layer, onClose }) => {
    const properties = feature?.properties || {};
    const displayName = feature ? getFeatureDisplayName(feature) : '';
    const { status, color } = feature ? getFeatureStatus(feature) : { status: '', color: '' };

    const featureArea = useMemo(() => {
        if (!feature) return 0;
        try {
            if (feature.geometry && (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")) {
                return area(feature);
            }
        } catch (e) {
            console.warn("Could not calculate area for a feature:", e);
        }
        return 0;
    }, [feature]);

    const formattedArea = featureArea > 0 ? `${featureArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq. m` : 'N/A';

    const detailMapping = {
        'Asset Type': layer?.name,
        'Area': formattedArea,
        'Construction Date': properties.Cons_Year,
    };

    // The panel is now a flex item that animates its width, pushing the map content.
    // It is no longer an absolute overlay.
    const panelClasses = `
        h-full flex-shrink-0
        bg-slate-900 border-l border-slate-800
        transition-all duration-500 ease-in-out
        overflow-hidden
        ${feature ? 'w-96' : 'w-0 border-l-0'}
    `;

    return (
        <aside className={panelClasses}>
            {/* This inner div has a fixed width to prevent content wrapping during animation */}
            <div className="w-96 h-full">
                {feature && layer && (
                     <div className="p-6 overflow-y-auto h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold leading-tight tracking-[-0.015em] text-white">Asset Details</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800/50">
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                        </div>
                        <div className="bg-cover bg-center h-48 w-full rounded-lg mb-4" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCvXNAP9wTpO8HtJNRlz84NGbA8iFLOvhxwOTxAIscf6cV8gExFo9mAc4S3L1T9_vWB8jLn7xbEGM_LF7QH4-gV_yKWBVP5gZKxKfuBfh-GKA7lFdgkw-ffhBWTPbXVknij-UUtQy4UD7RVd7yosNQ0CSIEyIAfvvogDP_N4QmGcegZhMSsLIRKaaWh86su4WPPgeo7i0Gp2YpVio_we9KSXnRSe7C6Q3tJrH7s40x6FIaeV6vZBOzsTC49d4Mln-YEwU4EYKKXz5Or")` }}></div>
                        <h4 className="text-lg font-bold text-white">{displayName}</h4>
                        <p className="text-sm text-slate-400 mb-4">ID: {properties.fid || 'N/A'}</p>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-400">Status</span>
                                <span className={`font-semibold ${color}`}>{status}</span>
                            </div>
                            {Object.entries(detailMapping).map(([key, value]) => value ? (
                                 <div key={key} className="flex justify-between items-center">
                                    <span className="font-medium text-slate-400">{key}</span>
                                    <span className="font-semibold text-gray-200 text-right">{value}</span>
                                </div>
                            ): null)}
                        </div>
                        <div className="border-t border-slate-800 my-6"></div>
                        <div>
                            <h5 className="font-bold text-white mb-3">Documents</h5>
                            <div className="space-y-2">
                                <a className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50" href="#">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>description</span>
                                    <span className="text-sm font-medium text-gray-200">architectural-plans.pdf</span>
                                </a>
                                <a className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50" href="#">
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>description</span>
                                    <span className="text-sm font-medium text-gray-200">inspection-report-2024.pdf</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default AssetDetailsPanel;