import { useRef, useCallback } from 'react';
import type { Vivienda } from '../services/mapService';

export const useGoogleMaps = () => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const kmlLayerRef = useRef<google.maps.KmlLayer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const initMap = useCallback((
    googleObj: typeof google,
    container: HTMLDivElement, 
    center: { lat: number, lng: number }
  ) => {
    if (!googleObj) return;

    mapRef.current = new googleObj.maps.Map(container, {
      center,
      zoom: 16,
      mapTypeId: 'satellite',
    });

    infoWindowRef.current = new googleObj.maps.InfoWindow();
  }, []);

  const clearMap = useCallback(() => {
    if (kmlLayerRef.current) {
      kmlLayerRef.current.setMap(null);
      kmlLayerRef.current = null;
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
  }, []);

  const renderLayers = useCallback((
    googleObj: typeof google,
    kmzUrl: string | null, 
    viviendas: Vivienda[],
    onMarkerDragEnd?: (id: string, lat: number, lng: number) => void
  ) => {
    if (!mapRef.current || !googleObj) return;

    // To handle overlapping markers
    const coordinateCounts: Record<string, number> = {};

    if (kmzUrl) {
      kmlLayerRef.current = new googleObj.maps.KmlLayer({
        url: kmzUrl,
        map: mapRef.current,
        preserveViewport: true,
      });
    }

    viviendas.forEach((vivienda) => {
      // Only render if we have coordinates
      if (!vivienda.lat || !vivienda.lng) return;

      const coordKey = `${vivienda.lat.toFixed(6)},${vivienda.lng.toFixed(6)}`;
      const count = coordinateCounts[coordKey] || 0;
      coordinateCounts[coordKey] = count + 1;

      // Apply a tiny offset if there's more than one marker at the same spot
      // This creates a small spiral/circle effect so they are independent
      let finalLat = vivienda.lat;
      let finalLng = vivienda.lng;

      if (count > 0) {
        const angle = (count * 137.5) * (Math.PI / 180); // Golden angle for even distribution
        const radius = 0.00003 * Math.sqrt(count); // Very small radius (~3-5 meters)
        finalLat += radius * Math.cos(angle);
        finalLng += radius * Math.sin(angle);
      }

      const completedTasks = Object.values(vivienda.status || {}).filter(Boolean).length;
      const totalTasks = 14; 
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
      
      const color = progress === 1 ? 'green' 
                  : progress > 0 ? 'yellow' 
                  : 'red';

      const marker = new googleObj.maps.Marker({
        position: { lat: finalLat, lng: finalLng },
        map: mapRef.current,
        title: vivienda.name,
        icon: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
        draggable: true
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos && onMarkerDragEnd) {
          onMarkerDragEnd(vivienda.id, pos.lat(), pos.lng());
        }
      });

      marker.addListener('click', () => {
        const content = `
          <div style="padding: 5px; color: #000;">
            <h3 style="margin: 0 0 5px 0; font-weight: bold; font-size: 16px;">${vivienda.name}</h3>
            <p style="margin: 0; font-size: 14px;">Avance: <strong>${Math.round(progress * 100)}%</strong></p>
          </div>
        `;
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, []);

  return { initMap, clearMap, renderLayers };
};
