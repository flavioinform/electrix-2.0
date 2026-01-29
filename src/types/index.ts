export type UserRole = 'supervisor' | 'trabajador' | 'cliente';

export interface Profile {
    id: string;
    rut: string;
    full_name: string;
    role: UserRole;
    created_at: string;
}

export interface Client {
    id: string;
    name: string;
    type: string;
    rut?: string; // Optional for backward compatibility, but recommended
    created_at: string;
}

export interface Project {
    id: string;
    client_id: string;
    name: string;
    created_at: string;
    status: string;
    client?: Client;
}

export interface HousingUnit {
    id: string;
    project_id: string;
    name: string;
    status: Record<string, boolean>; // { "factibilidad": true, ... }
    comments: string;
    images?: string[];
    created_at: string;
}

export interface AppTransaction {
    id: string;
    type: 'gasto' | 'ingreso';
    amount: number;
    category: string;
    description: string;
    date: string;
    created_by: string;
    created_at: string;
}
