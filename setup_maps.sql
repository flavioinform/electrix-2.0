-- Tabla de Proyectos
CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  kmz_path TEXT NOT NULL, -- Ruta en el bucket, ej: 'proyectos_kmz/mi-plano.kmz'
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Viviendas
CREATE TABLE viviendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('disponible', 'vendida', 'reservada')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Opcional, pero recomendado para mantener seguridad)
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE viviendas ENABLE ROW LEVEL SECURITY;
   