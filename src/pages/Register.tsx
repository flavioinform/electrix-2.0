import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
            // 1. Sign up auth user
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password: formData.password,
            });

            if (authError) throw authError;

            if (data.session) {
                // 2. Create profile
                // Note: In real setup, you might use a Trigger for this. 
                // But doing it client-side for simplicity here, relying on RLS "Users can insert their own profile"
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: data.user!.id,
                    rut: formData.rut,
                    full_name: formData.fullName,
                    role: formData.role,
                });

                if (profileError) throw profileError;

                navigate('/');
            } else {
                // If email confirmation is enabled, we might not have a session.
                setError('Registro exitoso. Por favor verifica tu correo (si aplica) o inicia sesión.');
            }

        } catch (err: any) {
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
                        Registro
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Crea tu cuenta en Electrix
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
                        <Link to="/login" className="text-primary hover:underline">
                            ¿Ya tienes cuenta? Inicia sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
