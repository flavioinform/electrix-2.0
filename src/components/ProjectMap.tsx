import React, { useEffect, useRef, useState } from 'react';
import { fetchProjectMapData } from '../services/mapService';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useJsApiLoader } from '@react-google-maps/api';

type Library = "places" | "drawing" | "geometry" | "visualization";
const libraries: Library[] = ['places'];

interface ProjectMapProps {
  proyectoId: string;
  viviendas?: any[]; // Allow passing fresh data from parent
  onViviendaMove?: (id: string, lat: number, lng: number) => void;
}

export const ProjectMap: React.FC<ProjectMapProps> = ({ proyectoId, viviendas: externalViviendas, onViviendaMove }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { initMap, clearMap, renderLayers } = useGoogleMaps();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    let active = true;

    const loadDataAndRenderMap = async () => {
      if (!isLoaded || !proyectoId || !mapContainerRef.current || !window.google) return;
      
      try {
        setLoading(true);
        setError(null);
        
        clearMap();

        const data = await fetchProjectMapData(proyectoId);
        
        if (!active) return;
        
        initMap(window.google, mapContainerRef.current, { lat: data.lat, lng: data.lng });
        
        // Use external viviendas if provided (for real-time updates), otherwise use fetched data
        const listToRender = externalViviendas || data.viviendas;
        renderLayers(window.google, data.kmzUrl, listToRender, onViviendaMove);

      } catch (err: any) {
        if (active) setError(err.message || 'Error al cargar mapa interactivo');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDataAndRenderMap();

    return () => { active = false; clearMap(); };
  }, [proyectoId, initMap, clearMap, renderLayers, isLoaded, externalViviendas]);

  if (loadError) {
    return (
      <div className="w-full relative rounded-lg overflow-hidden border bg-red-50 p-4">
        <p className="text-red-600 font-medium">Error cargando Google Maps API</p>
      </div>
    );
  }

  return (
    <div className="w-full relative rounded-lg overflow-hidden border">
      {(!isLoaded || loading) && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
          <span className="text-gray-900 font-medium">Cargando mapa...</span>
        </div>
      )}
      {error && (
        <div className="absolute top-0 w-full bg-red-500 text-white p-2 text-center z-10">
          {error}
        </div>
      )}
      
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '500px' }} 
      />
    </div>
  );
};
