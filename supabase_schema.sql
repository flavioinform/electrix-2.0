-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TYPE user_role AS ENUM ('supervisor', 'trabajador', 'cliente');

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    rut TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'trabajador',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. CLIENTS
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT, -- e.g., 'Constructora', 'Particular'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Supervisors and Workers can view/create clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supervisors and Workers can create clients"
ON public.clients FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('supervisor', 'trabajador'))
);

-- 3. PROJECTS
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'En curso'
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supervisors and Workers can create projects"
ON public.projects FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('supervisor', 'trabajador'))
);

-- 4. HOUSING UNITS (Viviendas)
CREATE TABLE public.housing_units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status JSONB DEFAULT '{}'::jsonb, -- Store checklist status here
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.housing_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view housing units"
ON public.housing_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supervisors and Workers can manage housing units"
ON public.housing_units FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('supervisor', 'trabajador'))
);

-- 5. TRANSACTIONS (Flujo de Caja)
CREATE TYPE transaction_type AS ENUM ('gasto', 'ingreso');

CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type transaction_type NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Supervisors can see ALL transactions
CREATE POLICY "Supervisors see all transactions"
ON public.transactions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor')
);

-- Workers can ONLY see EXPENSES (Gastos)
CREATE POLICY "Workers see only expenses"
ON public.transactions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trabajador')
    AND type = 'gasto'
);

-- Supervisors and Workers can insert transactions
-- Note: Workers usually only add expenses, but we might allow them to add incomes if needed. 
-- For now, allow both to insert, but UI will restrict.
CREATE POLICY "Supervisors and Workers can insert transactions"
ON public.transactions FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('supervisor', 'trabajador'))
);

-- STORAGE BUCKETS (You will need to create 'housing-images' bucket in Supabase Dashboard)
-- Policy for Storage would be:
-- INSERT: Authenticated users
-- SELECT: Authenticated users
