-- SOLUCIÓN FINAL A PERMISOS Y DATOS DESAPARECIDOS (v7)
-- INCLUYE: Corrección error is_supervisor ('admin') y Nueva función de recuperación.

-- 1. Función de Seguridad (is_supervisor) CORREGIDA
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean AS $$
BEGIN
  -- Verifica rol 'supervisor' (SIN 'admin')
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;    

-- 2. Función para Trabajadores
CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'trabajador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Función de Recuperación (NUEVO)
-- Permite encontrar usuarios "zombis" (que existen en Auth pero no tienen Perfil)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT id FROM auth.users WHERE email = user_email LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. APLICAR POLÍTICAS

-- === TABLA PROJECTS ===
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for supervisors" ON projects;
DROP POLICY IF EXISTS "Enable delete for supervisors" ON projects;
DROP POLICY IF EXISTS "Supervisor full access" ON projects;
DROP POLICY IF EXISTS "Supervisors have full control on projects" ON projects;
DROP POLICY IF EXISTS "Others can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated can view projects" ON projects;

CREATE POLICY "Supervisors have full control on projects" ON projects
FOR ALL USING ( public.is_supervisor() ) WITH CHECK ( public.is_supervisor() );

CREATE POLICY "Authenticated can view projects" ON projects
FOR SELECT USING ( auth.role() = 'authenticated' );


-- === TABLA TRANSACTIONS ===
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON transactions;
DROP POLICY IF EXISTS "Enable update for supervisors" ON transactions;
DROP POLICY IF EXISTS "Enable delete for supervisors" ON transactions;
DROP POLICY IF EXISTS "Supervisors have full control on transactions" ON transactions;
DROP POLICY IF EXISTS "Workers can view and create expenses" ON transactions;

CREATE POLICY "Supervisors have full control on transactions" ON transactions
FOR ALL USING ( public.is_supervisor() ) WITH CHECK ( public.is_supervisor() );

CREATE POLICY "Workers can view and create expenses" ON transactions
FOR ALL
USING ( public.is_worker() )
WITH CHECK ( public.is_worker() AND type = 'gasto' );


-- === TABLA CLIENTS ===
DROP POLICY IF EXISTS "Supervisors manage clients" ON clients;
DROP POLICY IF EXISTS "Authenticated can view clients" ON clients;

CREATE POLICY "Supervisors manage clients" ON clients
FOR ALL USING ( public.is_supervisor() ) WITH CHECK ( public.is_supervisor() );

CREATE POLICY "Authenticated can view clients" ON clients
FOR SELECT USING ( auth.role() = 'authenticated' );


-- === TABLA HOUSING_UNITS ===
DROP POLICY IF EXISTS "Supervisors manage units" ON housing_units;
DROP POLICY IF EXISTS "Authenticated can view units" ON housing_units;

CREATE POLICY "Supervisors manage units" ON housing_units
FOR ALL USING ( public.is_supervisor() ) WITH CHECK ( public.is_supervisor() );

CREATE POLICY "Authenticated can view units" ON housing_units
FOR SELECT USING ( auth.role() = 'authenticated' );


-- === TABLA PROFILES ===
DROP POLICY IF EXISTS "Supervisors manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles; 
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Supervisors manage profiles" ON profiles
FOR ALL USING ( public.is_supervisor() ) WITH CHECK ( public.is_supervisor() );
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- FORCE ENABLE RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
