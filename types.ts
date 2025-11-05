import type { FeatureCollection } from 'geojson';

export interface GeoJsonLayer {
  id: string;
  name: string;
  data: FeatureCollection;
  isVisible: boolean;
  color: string;
  strokeOpacity: number;
  fillOpacity: number;
  dashArray: string;
}
