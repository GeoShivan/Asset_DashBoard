import type { Feature } from 'geojson';

// Helper to get a display name for a feature
export const getFeatureDisplayName = (feature: Feature): string => {
  if (!feature.properties) return `Feature (unnamed)`;
  const props = feature.properties;
  const name = props.Name || props.name || props.NAME || props.Bldg_Name;
  if (name && String(name).trim() !== "") return String(name);

  const id = props.fid || props.id || props.ID || props.OBJECTID;
  return `Feature ${id || '(no ID)'}`;
};

// Helper to get status and color
export const getFeatureStatus = (feature: Feature): { status: string; color: string } => {
    const statusProp = feature.properties?.Status || 'Unknown';
    switch(String(statusProp).toLowerCase()) {
        case 'comp':
            return { status: 'Good Condition', color: 'text-green-400'};
        case 'requires maintenance':
            return { status: 'Requires Maintenance', color: 'text-yellow-400'};
        default:
            return { status: 'Unknown', color: 'text-slate-400'};
    }
}
