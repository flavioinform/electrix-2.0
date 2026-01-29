import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Client, Project, HousingUnit } from '../types';
import { Button } from '../components/Button';
import { Search, Building, FolderOpen, Home, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function ClientView() {
    const { user, profile } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [housingUnits, setHousingUnits] = useState<HousingUnit[]>([]);

    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    // Derived state for checking if user is restricted
    const isClientUser = profile?.role === 'cliente';

    useEffect(() => {
        fetchClients();
    }, [user, isClientUser]); // Re-fetch if user changes

    useEffect(() => {
        if (selectedClientId) {
            fetchProjects(selectedClientId);
            setSelectedProjectId('');
            setHousingUnits([]);
        } else {
            setProjects([]);
            setHousingUnits([]);
        }
    }, [selectedClientId]);

    useEffect(() => {
        if (selectedProjectId) {
            fetchHousingUnits(selectedProjectId);
        } else {
            setHousingUnits([]);
        }
    }, [selectedProjectId]);

    const fetchClients = async () => {
        let query = supabase.from('clients').select('*').order('name');

        // If user is a client, we MUST filter by their RUT to prevent seeing other companies
        if (isClientUser && user?.user_metadata?.rut) {
            const userRut = user.user_metadata.rut;
            // We need to match the RUT.
            // Note: ideally we strictly match. 
            // Since we added 'rut' column to clients table, we can filter by it.
            query = query.eq('rut', userRut);
        }

        const { data } = await query;

        if (data) {
            setClients(data);
            // Auto-select if there is only one client (which is expected for client users)
            if (data.length === 1) {
                setSelectedClientId(data[0].id);
            }
        }
    };

    const fetchProjects = async (clientId: string) => {
        const { data } = await supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
        if (data) setProjects(data);
    };

    const fetchHousingUnits = async (projectId: string) => {
        const { data } = await supabase.from('housing_units').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
        if (data) setHousingUnits(data);
    };

    return (
        <div className="min-h-screen bg-background p-6 space-y-8 animate-in fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 bg-primary/20 rounded flex items-center justify-center">
                    <Building className="text-primary h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Portal de Clientes</h1>
                    <p className="text-muted-foreground">Consulta el estado de tus proyectos</p>
                </div>
            </div>

            {/* Select Client - Only show selector if NOT restricted to single client, OR if we want to show the selected one as readonly */}
            {!isClientUser ? (
                <div className="max-w-xl">
                    <label className="text-sm font-medium mb-2 block">Selecciona tu empresa / cliente</label>
                    <div className="relative">
                        <select
                            className="flex h-12 w-full rounded-md border border-input bg-card px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={selectedClientId}
                            onChange={e => setSelectedClientId(e.target.value)}
                        >
                            <option value="">Seleccionar...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : (
                // If locked to a client, maybe show a welcome message with the client name instead of a dropdown
                clients.length > 0 && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                        <span className="font-semibold">Bienvenido, {clients[0].name}</span>
                    </div>
                )
            )}

            {/* Projects */}
            {selectedClientId && (
                <div className="space-y-6 border-t border-border/50 pt-8">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FolderOpen className="text-primary" /> Proyectos
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProjectId(p.id)}
                                className={cn(
                                    "cursor-pointer rounded-xl border p-6 transition-all hover:border-primary hover:bg-secondary/10",
                                    selectedProjectId === p.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                                )}
                            >
                                <h3 className="font-bold text-lg">{p.name}</h3>
                                <p className="text-sm text-muted-foreground mt-2">Estado: <span className="text-primary">{p.status}</span></p>
                                <p className="text-xs text-muted-foreground mt-4 block">Click para ver detalle</p>
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <p className="text-muted-foreground col-span-full">No tienes proyectos asignados.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Units */}
            {selectedProjectId && (
                <div className="space-y-6 border-t border-border/50 pt-8">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Home className="text-primary" /> Avance de Viviendas
                    </h2>

                    <div className="grid gap-4">
                        {housingUnits.map(unit => (
                            <div key={unit.id} className="bg-card border border-border rounded-lg p-6">
                                <h3 className="text-lg font-bold mb-4">{unit.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(unit.status || {}).map(([key, value]) => {
                                        if (!value) return null;
                                        return (
                                            <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {key}
                                            </span>
                                        )
                                    })}
                                    {Object.keys(unit.status || {}).length === 0 && (
                                        <span className="text-muted-foreground text-sm italic">Sin avances registrados</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
