import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js'; // For temporary client
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Label } from '../components/Label';
import { Zap } from 'lucide-react';
import type { UserRole } from '../types';
import { formatRut } from '../lib/utils';

export default function Register() {
    const [formData, setFormData] = useState({
        rut: '',
        fullName: '',
        password: '',
        role: 'trabajador' as UserRole,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.name === 'rut' ? formatRut(e.target.value) : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Create a clean version of the RUT (numbers and k/K only) for the email to ensure validity
        const cleanRut = formData.rut.replace(/[^0-9kK]/g, '');
        const email = `${cleanRut}@electrix.com`;

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

            // 2. Sign up auth user
            const { data, error: authError } = await tempSupabase.auth.signUp({
                email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        rut: formData.rut,
                        role: formData.role
                    }
                }
            });

            if (authError) throw authError;

            if (data.user) {
                // Success! The Trigger or RLS should handle profile creation if set up, 
                // OR we can try to insert it using the temp client if RLS allows it (it might not if it checks auth.uid() vs user).
                // Usually, we rely on the session we just created in tempSupabase.

                // For this app's logic (seen in Workflow.tsx), we might just need the Auth user.
                // But let's check how profile is inserted. 
                // In original Register.tsx line 49, it inserted into 'profiles'.
                // If we use tempSupabase, we are logged in as the NEW user in that client instance.

                const { error: profileError } = await tempSupabase.from('profiles').insert({
                    id: data.user.id,
                    rut: formData.rut,
                    full_name: formData.fullName,
                    role: formData.role,
                });

                if (profileError) {
                    console.error("Profile creation error", profileError);
                    // Continue anyway or throw? If profile fails, user exists but logic might break.
                    // Given previous code did it manually, we should too.
                    throw profileError;
                }

                alert("¡Usuario registrado con éxito!");
                navigate('/team'); // Go back to Team list or Home
            } else {
                setError('No se pudo crear el usuario.');
            }

        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/20">
                        <Zap className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-primary">
                        Registrar Nuevo Usuario
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Crea una cuenta para un trabajador o supervisor
                    </p>
                </div>

                <form onSubmit={handleRegister} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="rut">RUT</Label>
                            <Input
                                id="rut"
                                name="rut"
                                type="text"
                                placeholder="12.345.678-9"
                                required
                                value={formData.rut}
                                onChange={handleChange}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="fullName">Nombre Completo</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                type="text"
                                placeholder="Juan Pérez"
                                required
                                value={formData.fullName}
                                onChange={handleChange}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="role">Rol</Label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="trabajador">Trabajador</option>
                                <option value="supervisor">Supervisor</option>
                                {/* <option value="cliente">Cliente</option> - Maybe restricted? User asked for worker/supervisor choice. */}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="********"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                        disabled={loading}
                    >
                        {loading ? 'Registrando...' : 'Registrarse'}
                    </Button>

                    <div className="text-center text-sm">
                        <Button variant="ghost" type="button" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-primary">
                            Cancelar / Volver
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
