import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js'; // For temporary client
import type { Client, Project, HousingUnit } from '../types';
import { HousingUnitRow } from '../components/HousingUnitRow';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Label } from '../components/Label';
import { Search, Building, FolderOpen, Home, Key, UserPlus, Pencil, Trash2, X, Check } from 'lucide-react';
import { formatRut } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export default function Workflow() {
    const { profile } = useAuth();

    // State
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [housingUnits, setHousingUnits] = useState<HousingUnit[]>([]);

    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    const [loadingClients, setLoadingClients] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingUnits, setLoadingUnits] = useState(false);

    // Forms State
    const [newClientName, setNewClientName] = useState('');
    const [newClientRut, setNewClientRut] = useState('');
    const [newClientType, setNewClientType] = useState('Constructora');
    const [showAddClient, setShowAddClient] = useState(false);

    // Edit Client State
    const [isEditingClient, setIsEditingClient] = useState(false);
    const [editClientName, setEditClientName] = useState('');
    const [editClientRut, setEditClientRut] = useState('');
    const [editClientType, setEditClientType] = useState('');

    const [newProjectName, setNewProjectName] = useState('');
    const [showAddProject, setShowAddProject] = useState(false);

    const [newUnitName, setNewUnitName] = useState('');
    const [showAddUnit, setShowAddUnit] = useState(false);

    // Edit Project State
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editProjectName, setEditProjectName] = useState('');

    // Constants
    const CLIENT_TYPES = ["Constructora", "Particular", "Empresa", "Otro"];

    // Fetching
    useEffect(() => {
        fetchClients();
    }, []);

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
        setLoadingClients(true);
        const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (data) setClients(data);
        setLoadingClients(false);
    };

    const fetchProjects = async (clientId: string) => {
        setLoadingProjects(true);
        const { data } = await supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
        if (data) setProjects(data);
        setLoadingProjects(false);
    };

    const fetchHousingUnits = async (projectId: string) => {
        setLoadingUnits(true);
        const { data } = await supabase.from('housing_units').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
        if (data) setHousingUnits(data);
        setLoadingUnits(false);
    };

    // Actions
    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName) return;

        const { data } = await supabase.from('clients').insert({
            name: newClientName,
            type: newClientType,
            rut: newClientRut || null,
            created_by: profile?.id
        }).select().single();

        if (data) {
            setClients([data, ...clients]);
            setSelectedClientId(data.id); // Auto select
            setNewClientName('');
            setNewClientRut('');
            setShowAddClient(false);
        }
    };

    const handleUpdateClient = async () => {
        if (!editClientName || !selectedClientId) return;

        const { error } = await supabase
            .from('clients')
            .update({
                name: editClientName,
                rut: editClientRut || null,
                type: editClientType
            })
            .eq('id', selectedClientId);

        if (!error) {
            setClients(clients.map(c => c.id === selectedClientId ? {
                ...c,
                name: editClientName,
                rut: editClientRut,
                type: editClientType
            } : c));
            setIsEditingClient(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName || !selectedClientId) return;

        const { data } = await supabase.from('projects').insert({
            client_id: selectedClientId,
            name: newProjectName,
            status: 'En curso'
        }).select().single();

        if (data) {
            setProjects([data, ...projects]);
            setSelectedProjectId(data.id); // Auto select
            setNewProjectName('');
            setShowAddProject(false);
        }
    };

    const handleCreateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName || !selectedProjectId) return;

        const { data } = await supabase.from('housing_units').insert({
            project_id: selectedProjectId,
            name: newUnitName,
            status: {}
        }).select().single();

        if (data) {
            setHousingUnits([...housingUnits, data]); // Append to end usually
            setNewUnitName('');
            setShowAddUnit(false);
        }
    };

    const handleUpdateProject = async () => {
        if (!editProjectName || !selectedProjectId) return;

        const { error } = await supabase
            .from('projects')
            .update({ name: editProjectName })
            .eq('id', selectedProjectId);

        if (!error) {
            setProjects(projects.map(p => p.id === selectedProjectId ? { ...p, name: editProjectName } : p));
            setIsEditingProject(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!selectedProjectId) return;

        if (!window.confirm("¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer y borrará todas las unidades asociadas.")) {
            return;
        }

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', selectedProjectId);

        if (!error) {
            setProjects(projects.filter(p => p.id !== selectedProjectId));
            setSelectedProjectId('');
            setHousingUnits([]);
            setIsEditingProject(false);
        }
    };

    // Credential Generation State
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentialPassword, setCredentialPassword] = useState('');
    const [creatingCredentials, setCreatingCredentials] = useState(false);

    const handleCreateClientCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find(c => c.id === selectedClientId);
        if (!client || !client.rut || !credentialPassword) {
            alert("Error: El cliente debe tener un RUT y la contraseña es obligatoria.");
            return;
        }

        setCreatingCredentials(true);
        try {
            // 1. Create a TEMPORARY Supabase client to avoid logging out the supervisor
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false, // Critical: Don't save this session
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // 2. Prepare email (RUT based)
            // cleanRut remove all non alphanumeric characters
            const cleanRut = client.rut.replace(/[^0-9kK]/g, '');
            const email = `${cleanRut}@electrix.com`;

            // 3. Sign Up
            const { error: authError } = await tempSupabase.auth.signUp({
                email,
                password: credentialPassword,
                options: {
                    data: {
                        full_name: client.name,
                        rut: client.rut,
                        role: 'cliente' // Important: Set role to client
                    }
                }
            });

            if (authError) throw authError;

            alert(`¡Credenciales creadas con éxito!\n\nUsuario: ${client.rut}\nContraseña: ${credentialPassword}`);
            setShowCredentialsModal(false);
            setCredentialPassword('');
        } catch (error: any) {
            console.error("Error creating credentials:", error);
            alert(`Error al crear credenciales: ${error.message}`);
        } finally {
            setCreatingCredentials(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Clients Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Building className="text-primary" /> Clientes
                    </h2>
                    <Button size="sm" onClick={() => setShowAddClient(!showAddClient)}>
                        {showAddClient ? 'Cancelar' : '+ Agregar Cliente'}
                    </Button>
                </div>

                {showAddClient && (
                    <form onSubmit={handleCreateClient} className="bg-card border border-border p-4 rounded-lg flex gap-4 items-end animate-in zoom-in-95 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <Label>Nombre del cliente</Label>
                            <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Constructora Sygma" autoFocus />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Label>RUT Empresa/Cliente</Label>
                            <Input
                                value={newClientRut}
                                onChange={e => setNewClientRut(formatRut(e.target.value))}
                                placeholder="12.345.678-9"
                                maxLength={12}
                            />
                        </div>
                        <div className="w-48">
                            <Label>Tipo</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newClientType}
                                onChange={e => setNewClientType(e.target.value)}
                            >
                                {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <Button type="submit">Crear</Button>
                    </form>
                )}

                <div className="flex items-end gap-4">
                    <div className="relative flex-1">
                        <Label>Seleccionar Cliente</Label>
                        <div className="relative">
                            {isEditingClient ? (
                                <div className="flex items-center gap-2 animate-in fade-in flex-wrap bg-card border border-border p-2 rounded-md">
                                    <div className="flex-1 min-w-[200px]">
                                        <Input
                                            value={editClientName}
                                            onChange={e => setEditClientName(e.target.value)}
                                            placeholder="Nombre"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <Input
                                            value={editClientRut}
                                            onChange={e => setEditClientRut(formatRut(e.target.value))}
                                            placeholder="RUT"
                                            maxLength={12}
                                        />
                                    </div>
                                    <div className="w-40">
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={editClientType}
                                            onChange={e => setEditClientType(e.target.value)}
                                        >
                                            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <Button size="sm" onClick={handleUpdateClient} className="bg-green-600 hover:bg-green-700">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingClient(false)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <select
                                            className="flex h-12 w-full rounded-md border border-input bg-card px-10 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={selectedClientId}
                                            onChange={e => setSelectedClientId(e.target.value)}
                                        >
                                            <option value="">Seleccionar Cliente...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.type}) {c.rut ? `- ${c.rut}` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {selectedClientId && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-12 w-12 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => {
                                                const client = clients.find(c => c.id === selectedClientId);
                                                if (client) {
                                                    setEditClientName(client.name);
                                                    setEditClientRut(client.rut || '');
                                                    setEditClientType(client.type);
                                                    setIsEditingClient(true);
                                                }
                                            }}
                                            title="Editar cliente"
                                        >
                                            <Pencil className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedClientId && !isEditingClient && profile?.role === 'supervisor' && (
                        <Button
                            className="h-12 gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            onClick={() => setShowCredentialsModal(true)}
                        >
                            <Key className="h-4 w-4" />
                            Generar Acceso
                        </Button>
                    )}
                </div>

                {/* Credentials Modal */}
                {showCredentialsModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-primary" />
                                Crear Credenciales
                            </h3>
                            <p className="text-muted-foreground mb-4 text-sm">
                                Esto creará un usuario para <strong>{clients.find(c => c.id === selectedClientId)?.name}</strong>.
                                El usuario podrá iniciar sesión con su RUT y la contraseña que definas aquí.
                            </p>

                            <form onSubmit={handleCreateClientCredentials} className="space-y-4">
                                <div>
                                    <Label>RUT (Solo lectura)</Label>
                                    <Input
                                        value={clients.find(c => c.id === selectedClientId)?.rut || 'Sin RUT asignado'}
                                        disabled
                                        className="bg-muted"
                                    />
                                    {!clients.find(c => c.id === selectedClientId)?.rut && (
                                        <p className="text-xs text-destructive mt-1">Este cliente no tiene RUT. Debes editarlo o crear uno nuevo con RUT.</p>
                                    )}
                                </div>

                                <div>
                                    <Label>Asignar Contraseña</Label>
                                    <Input
                                        type="text" // Visible so supervisor can see it
                                        value={credentialPassword}
                                        onChange={e => setCredentialPassword(e.target.value)}
                                        placeholder="Ej. electrix2024"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="ghost" onClick={() => setShowCredentialsModal(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={creatingCredentials || !clients.find(c => c.id === selectedClientId)?.rut}>
                                        {creatingCredentials ? 'Creando...' : 'Crear Usuario'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </section>

            {/* 2. Projects Section */}
            {selectedClientId && (
                <section className="space-y-4 border-t border-border/50 pt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FolderOpen className="text-primary" /> Proyectos
                        </h2>
                        <Button size="sm" onClick={() => setShowAddProject(!showAddProject)}>
                            {showAddProject ? 'Cancelar' : '+ Agregar Proyecto'}
                        </Button>
                    </div>

                    {showAddProject && (
                        <form onSubmit={handleCreateProject} className="bg-card border border-border p-4 rounded-lg flex gap-4 items-end animate-in zoom-in-95">
                            <div className="flex-1">
                                <Label>Nombre del proyecto</Label>
                                <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Ej. Edificio A" autoFocus />
                            </div>
                            <Button type="submit">Crear</Button>
                        </form>
                    )}

                    <div className="relative flex items-center gap-2">
                        {isEditingProject ? (
                            <div className="flex-1 flex items-center gap-2 animate-in fade-in">
                                <Input
                                    value={editProjectName}
                                    onChange={e => setEditProjectName(e.target.value)}
                                    autoFocus
                                    className="h-10"
                                />
                                <Button size="sm" onClick={handleUpdateProject} className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700">
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingProject(false)} className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <select
                                    className="flex h-12 w-full rounded-md border border-input bg-card px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={selectedProjectId}
                                    onChange={e => setSelectedProjectId(e.target.value)}
                                >
                                    <option value="">Seleccionar Proyecto...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>

                                {selectedProjectId && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-12 w-12 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => {
                                                const proj = projects.find(p => p.id === selectedProjectId);
                                                if (proj) {
                                                    setEditProjectName(proj.name);
                                                    setIsEditingProject(true);
                                                }
                                            }}
                                            title="Editar nombre del proyecto"
                                        >
                                            <Pencil className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-12 w-12 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={handleDeleteProject}
                                            title="Eliminar proyecto"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            )}

            {/* 3. Housing Units Section */}
            {selectedProjectId && (
                <section className="space-y-4 border-t border-border/50 pt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Home className="text-primary" /> Viviendas / Unidades
                        </h2>
                        <Button size="sm" className="bg-primary text-primary-foreground font-bold" onClick={() => setShowAddUnit(!showAddUnit)}>
                            {showAddUnit ? 'Cancelar' : '+ Agregar Vivienda'}
                        </Button>
                    </div>

                    {showAddUnit && (
                        <form onSubmit={handleCreateUnit} className="bg-card border border-border p-4 rounded-lg flex gap-4 items-end animate-in zoom-in-95">
                            <div className="flex-1">
                                <Label>Nombre de idenfiticación</Label>
                                <Input value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="Ej. Depto 101" autoFocus />
                            </div>
                            <Button type="submit">Agregar</Button>
                        </form>
                    )}

                    <div className="space-y-4">
                        {housingUnits.length === 0 && !loadingUnits && (
                            <div className="text-center py-10 text-muted-foreground">
                                No hay viviendas registradas en este proyecto.
                            </div>
                        )}
                        {housingUnits.map(unit => (
                            <HousingUnitRow
                                key={unit.id}
                                unit={unit}
                                onUpdate={(updated) => {
                                    setHousingUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}

        </div>
    );
}
