import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js'; // For temporary client
import type { Client, Project, HousingUnit, Profile } from '../types';
import { HousingUnitRow } from '../components/HousingUnitRow';
import { ProjectMap } from '../components/ProjectMap';
import { useJsApiLoader, StandaloneSearchBox } from '@react-google-maps/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Label } from '../components/Label';
import { Search, Building, FolderOpen, Home, Key, UserPlus, Pencil, Trash2, X, Check, Loader2, ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react';
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

    const [loadingUnits, setLoadingUnits] = useState(false);

    // Google Maps Search Box refs
    const newProjectSearchBoxRef = React.useRef<google.maps.places.SearchBox | null>(null);
    const editProjectSearchBoxRef = React.useRef<google.maps.places.SearchBox | null>(null);

    // Load Maps API libraries
    const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

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
    const [newProjectLat, setNewProjectLat] = useState('');
    const [newProjectLng, setNewProjectLng] = useState('');
    const [showAddProject, setShowAddProject] = useState(false);

    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitLat, setNewUnitLat] = useState('');
    const [newUnitLng, setNewUnitLng] = useState('');
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Project State
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editProjectName, setEditProjectName] = useState('');
    const [editProjectLat, setEditProjectLat] = useState('');
    const [editProjectLng, setEditProjectLng] = useState('');
    const [editProjectKmzFile, setEditProjectKmzFile] = useState<File | null>(null);
    const [isUploadingKmz, setIsUploadingKmz] = useState(false);
    const [showMap, setShowMap] = useState(false);

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
        const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (data) setClients(data);
    };

    const fetchProjects = async (clientId: string) => {
        const { data } = await supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
        if (data) setProjects(data);
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
            status: 'En curso',
            lat: newProjectLat ? parseFloat(newProjectLat) : null,
            lng: newProjectLng ? parseFloat(newProjectLng) : null
        }).select().single();

        if (data) {
            setProjects([data, ...projects]);
            setSelectedProjectId(data.id); // Auto select
            setNewProjectName('');
            setNewProjectLat('');
            setNewProjectLng('');
            setShowAddProject(false);
        }
    };

    const handleMarkerDragEnd = async (viviendaId: string, lat: number, lng: number) => {
        // 1. Update local state for immediate feedback
        setHousingUnits(prev => prev.map(u => u.id === viviendaId ? { ...u, lat, lng } : u));

        // 2. Persist to database
        const { error } = await supabase
            .from('housing_units')
            .update({ lat, lng })
            .eq('id', viviendaId);

        if (error) {
            console.error("Error updating housing unit position:", error);
            alert("Error al guardar la nueva posición: " + error.message);
        }
    };

    const handleCreateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName || !selectedProjectId) return;

        const { data } = await supabase.from('housing_units').insert({
            project_id: selectedProjectId,
            name: newUnitName,
            status: {},
            lat: newUnitLat ? parseFloat(newUnitLat) : null,
            lng: newUnitLng ? parseFloat(newUnitLng) : null
        }).select().single();

        if (data) {
            setHousingUnits([...housingUnits, data]); // Append to end usually
            setNewUnitName('');
            setNewUnitLat('');
            setNewUnitLng('');
            setShowAddUnit(false);
        }
    };

    // Places Callbacks
    const onNewProjectPlacesChanged = () => {
        const places = newProjectSearchBoxRef.current?.getPlaces();
        if (places && places.length > 0) {
            const place = places[0];
            if (place.geometry?.location) {
                setNewProjectLat(place.geometry.location.lat().toString());
                setNewProjectLng(place.geometry.location.lng().toString());
                if (!newProjectName && place.name) {
                    setNewProjectName(place.name);
                }
            }
        }
    };

    const onEditProjectPlacesChanged = () => {
        const places = editProjectSearchBoxRef.current?.getPlaces();
        if (places && places.length > 0) {
            const place = places[0];
            if (place.geometry?.location) {
                setEditProjectLat(place.geometry.location.lat().toString());
                setEditProjectLng(place.geometry.location.lng().toString());
            }
        }
    };

    const handleUpdateProject = async () => {
        if (!editProjectName || !selectedProjectId) return;

        let kmz_path = undefined;
        if (editProjectKmzFile) {
            setIsUploadingKmz(true);
            const fileExt = editProjectKmzFile.name.split('.').pop();
            const fileName = `${selectedProjectId}-${Math.random()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('mapas')
                .upload(fileName, editProjectKmzFile);
                
            if (!uploadError) {
                kmz_path = fileName;
            }
            setIsUploadingKmz(false);
        }

        const updates: any = { 
            name: editProjectName,
            lat: editProjectLat ? parseFloat(editProjectLat) : null,
            lng: editProjectLng ? parseFloat(editProjectLng) : null
        };
        if (kmz_path !== undefined) updates.kmz_path = kmz_path;

        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', selectedProjectId);

        if (!error) {
            setProjects(projects.map(p => p.id === selectedProjectId ? { ...p, ...updates } : p));
            setIsEditingProject(false);
            setEditProjectKmzFile(null);
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

        if (error) {
            alert('Error al eliminar el proyecto: ' + error.message);
        } else {
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
    const [existingUser, setExistingUser] = useState<Profile | null>(null);
    const [checkingAccess, setCheckingAccess] = useState(false);

    const handleOpenCredentialsModal = async () => {
        const client = clients.find(c => c.id === selectedClientId);
        if (!client || !client.rut) {
            alert("El cliente debe tener un RUT para generar acceso.");
            return;
        }

        setCheckingAccess(true);
        // 1. Check if profile exists (Ideal case)
        const { data: profile } = await supabase.from('profiles').select('*').eq('rut', client.rut).single();

        if (profile) {
            setExistingUser(profile);
        } else {
            // 2. Fallback: User might exist in Auth but not in Profiles (Zombie user)
            // Try to find by email via RPC
            const cleanRut = client.rut.replace(/[^0-9kK]/g, '');
            const email = `${cleanRut}@electrix.com`;

            const { data: userId } = await supabase.rpc('get_user_id_by_email', { user_email: email });

            if (userId) {
                // Found a zombie user. create a mock profile so we can reset password
                setExistingUser({
                    id: userId,
                    rut: client.rut,
                    full_name: client.name,
                    role: 'cliente',
                    created_at: new Date().toISOString()
                });
            } else {
                setExistingUser(null);
            }
        }

        setCredentialPassword('');
        setShowCredentialsModal(true);
        setCheckingAccess(false);
    };

    const handleCreateClientCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find(c => c.id === selectedClientId);
        if (!client || !client.rut || !credentialPassword) return;

        setCreatingCredentials(true);
        try {
            // 1. Create a TEMPORARY Supabase client
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // 2. Prepare email
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
                        role: 'cliente'
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

    const handleResetClientPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!existingUser || !credentialPassword) return;

        setCreatingCredentials(true);
        const { error } = await supabase.rpc('admin_reset_password', {
            target_user_id: existingUser.id,
            new_password: credentialPassword
        });

        setCreatingCredentials(false);

        if (error) {
            alert('Error al actualizar contraseña: ' + error.message);
        } else {
            alert(`¡Acceso actualizado!\n\nUsuario: ${existingUser.rut}\nNueva Contraseña: ${credentialPassword}`);
            setShowCredentialsModal(false);
            setCredentialPassword('');
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
                            onClick={handleOpenCredentialsModal}
                            disabled={checkingAccess}
                        >
                            {checkingAccess ? (
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Key className="h-4 w-4" />
                            )}
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
                                {existingUser ? 'Actualizar Acceso' : 'Crear Credenciales'}
                            </h3>

                            {existingUser ? (
                                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-600 text-sm">
                                    <strong>¡Aviso!</strong> Este cliente ya tiene un usuario activo.
                                    <br /><br />
                                    Por seguridad, <strong>no podemos mostrar la contraseña actual</strong>.
                                    Sin embargo, puedes crear una nueva aquí mismo y compartirla con el cliente.
                                </div>
                            ) : (
                                <p className="text-muted-foreground mb-4 text-sm">
                                    Esto creará un usuario para <strong>{clients.find(c => c.id === selectedClientId)?.name}</strong>.
                                    El usuario podrá iniciar sesión con su RUT y la contraseña que definas aquí.
                                </p>
                            )}

                            <form onSubmit={existingUser ? handleResetClientPassword : handleCreateClientCredentials} className="space-y-4">
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
                                    <Label>{existingUser ? 'Nueva Contraseña' : 'Asignar Contraseña'}</Label>
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
                                        {creatingCredentials ? 'Procesando...' : (existingUser ? 'Actualizar Contraseña' : 'Crear Usuario')}
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
                        <form onSubmit={handleCreateProject} className="bg-card border border-border p-4 rounded-lg flex gap-4 items-end animate-in zoom-in-95 flex-wrap">
                            <div className="w-full mb-2">
                                <Label>Buscar Ubicación</Label>
                                {isLoaded ? (
                                    <StandaloneSearchBox
                                        onLoad={ref => newProjectSearchBoxRef.current = ref}
                                        onPlacesChanged={onNewProjectPlacesChanged}
                                    >
                                        <Input
                                            type="text"
                                            placeholder="Busca una dirección o lugar con Google Maps..."
                                            className="w-full h-10"
                                        />
                                    </StandaloneSearchBox>
                                ) : (
                                    <Input placeholder="Cargando Google Maps..." disabled className="w-full h-10" />
                                )}
                            </div>
                            <div className="flex-[2] min-w-[200px]">
                                <Label>Nombre del proyecto</Label>
                                <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Ej. Edificio A" />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <Label>Latitud</Label>
                                <Input value={newProjectLat} onChange={e => setNewProjectLat(e.target.value)} placeholder="-33.448" type="number" step="any" />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <Label>Longitud</Label>
                                <Input value={newProjectLng} onChange={e => setNewProjectLng(e.target.value)} placeholder="-70.669" type="number" step="any" />
                            </div>
                            <Button type="submit">Crear</Button>
                        </form>
                    )}

                    <div className="relative flex items-center gap-2">
                        {isEditingProject ? (
                            <div className="flex-1 flex flex-col gap-2 animate-in fade-in bg-card border border-border p-4 rounded-lg">
                                <div className="w-full mb-2">
                                    <Label>Buscar Nueva Ubicación</Label>
                                    {isLoaded ? (
                                        <StandaloneSearchBox
                                            onLoad={ref => editProjectSearchBoxRef.current = ref}
                                            onPlacesChanged={onEditProjectPlacesChanged}
                                        >
                                            <Input
                                                type="text"
                                                placeholder="Actualiza la ubicación buscando una dirección..."
                                                className="w-full h-10"
                                            />
                                        </StandaloneSearchBox>
                                    ) : null}
                                </div>
                                <div className="flex gap-2 items-end flex-wrap">
                                    <div className="flex-[2] min-w-[150px]">
                                        <Label>Nombre</Label>
                                        <Input
                                            value={editProjectName}
                                            onChange={e => setEditProjectName(e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <Label>Latitud</Label>
                                        <Input
                                            value={editProjectLat}
                                            onChange={e => setEditProjectLat(e.target.value)}
                                            type="number" step="any"
                                            className="h-10"
                                            placeholder="-33.448"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                        <Label>Longitud</Label>
                                        <Input
                                            value={editProjectLng}
                                            onChange={e => setEditProjectLng(e.target.value)}
                                            type="number" step="any"
                                            className="h-10"
                                            placeholder="-70.669"
                                        />
                                    </div>
                                    <div className="flex-[2] min-w-[200px]">
                                        <Label>Archivo KMZ</Label>
                                        <Input
                                            type="file"
                                            accept=".kmz"
                                            onChange={e => setEditProjectKmzFile(e.target.files?.[0] || null)}
                                            className="h-10 pt-1.5"
                                        />
                                    </div>
                                    <div className="flex gap-1 ml-auto">
                                        <Button size="sm" onClick={handleUpdateProject} disabled={isUploadingKmz} className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700">
                                            {isUploadingKmz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingProject(false)} disabled={isUploadingKmz} className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
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
                                                    setEditProjectLat(proj.lat?.toString() || '');
                                                    setEditProjectLng(proj.lng?.toString() || '');
                                                    setEditProjectKmzFile(null);
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

                    {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.lat && projects.find(p => p.id === selectedProjectId)?.lng && (
                        <div className="mt-8 border border-border rounded-lg overflow-hidden transition-all duration-300">
                            <button 
                                onClick={() => setShowMap(!showMap)}
                                className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <MapIcon className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-bold">Ubicación del Proyecto</h3>
                                </div>
                                {showMap ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                            
                            {showMap && (
                                <div className="p-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
                                    <ProjectMap 
                                        proyectoId={selectedProjectId} 
                                        viviendas={housingUnits} 
                                        onViviendaMove={handleMarkerDragEnd}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* 3. Housing Units Section */}
            {selectedProjectId && (
                <section className="space-y-4 border-t border-border/50 pt-8">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Home className="text-primary" /> Viviendas / Unidades
                        </h2>

                        <div className="flex items-center gap-4 flex-1 justify-end w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar vivienda..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button size="sm" className="bg-primary text-primary-foreground font-bold whitespace-nowrap" onClick={() => {
                                if (!showAddUnit) {
                                    const proj = projects.find(p => p.id === selectedProjectId);
                                    if (proj) {
                                        setNewUnitLat(proj.lat?.toString() || '');
                                        setNewUnitLng(proj.lng?.toString() || '');
                                    }
                                }
                                setShowAddUnit(!showAddUnit);
                            }}>
                                {showAddUnit ? 'Cancelar' : '+ Agregar Vivienda'}
                            </Button>
                        </div>
                    </div>

                    {showAddUnit && (
                        <form onSubmit={handleCreateUnit} className="bg-card border border-border p-4 rounded-lg flex gap-4 items-end animate-in zoom-in-95 flex-wrap">
                            <div className="flex-[2] min-w-[200px]">
                                <Label>Nombre de idenfiticación</Label>
                                <Input value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="Ej. Depto 101" autoFocus />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <Label>Latitud (Opcional)</Label>
                                <Input value={newUnitLat} onChange={e => setNewUnitLat(e.target.value)} placeholder="-33.448" type="number" step="any" />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <Label>Longitud (Opcional)</Label>
                                <Input value={newUnitLng} onChange={e => setNewUnitLng(e.target.value)} placeholder="-70.669" type="number" step="any" />
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
                        {housingUnits
                            .filter(unit => unit.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(unit => (
                                <HousingUnitRow
                                    key={unit.id}
                                    unit={unit}
                                    onUpdate={(updated) => {
                                        setHousingUnits(prev => prev.map(u => u.id === updated.id ? updated : u));
                                    }}
                                    onDelete={async () => {
                                        if (!window.confirm("¿Estás seguro de que quieres eliminar esta vivienda?")) return;

                                        const { error } = await supabase
                                            .from('housing_units')
                                            .delete()
                                            .eq('id', unit.id);

                                        if (error) {
                                            alert("Error al eliminar la vivienda: " + error.message);
                                        } else {
                                            setHousingUnits(prev => prev.filter(u => u.id !== unit.id));
                                        }
                                    }}
                                />
                            ))}
                        {housingUnits.length > 0 && housingUnits.filter(unit => unit.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No se encontraron viviendas que coincidan con "{searchQuery}"
                            </div>
                        )}
                    </div>
                </section>
            )}

        </div>
    );
}
