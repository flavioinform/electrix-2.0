import { supabase } from '../lib/supabase';

export interface Vivienda {
  id: string;
  name: string;
  status: any;
  lat: number;
  lng: number;
}

export interface ProjectMapData {
  lat: number;
  lng: number;
  kmzUrl: string | null;
  viviendas: Vivienda[];
}

export const fetchProjectMapData = async (proyectoId: string): Promise<ProjectMapData> => {
  // 1. Fetch Proyecto + Viviendas en una sola llamada a bbdd
  const { data: proyecto, error: pError } = await supabase
    .from('projects')
    .select(`
      lat, 
      lng, 
      kmz_path,
      housing_units ( id, name, status, lat, lng )
    `)
    .eq('id', proyectoId)
    .single();

  if (pError) throw new Error(pError.message);

  // 2. Generar Signed URL para el archivo KMZ (Válido por 1 hora, ej. 3600 segundos)
  let kmzUrl = null;
  if (proyecto.kmz_path) {
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('mapas') // Asegúrate de que este es el nombre real de tu bucket en Supabase
      .createSignedUrl(proyecto.kmz_path, 3600);
    
    if (urlError) throw new Error(urlError.message);
    kmzUrl = urlData?.signedUrl;
  }

  return {
    lat: proyecto.lat,
    lng: proyecto.lng,
    kmzUrl,
    viviendas: proyecto.housing_units as Vivienda[]
  };
};
