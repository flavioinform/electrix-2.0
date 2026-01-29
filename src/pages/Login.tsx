import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Label } from '../components/Label';
import { Zap } from 'lucide-react';
import { formatRut } from '../lib/utils';

export default function Login() {
    const [rut, setRut] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Map RUT to email (e.g., 12345678-9 -> 12345678-9@electrix.local)
        // In a real app, you might validate the RUT format first.
        // Create a clean version of the RUT (numbers and k/K only) for the email
        const cleanRut = rut.replace(/[^0-9kK]/g, '');
        const email = `${cleanRut}@electrix.com`;

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('RUT o contraseña incorrectos');
                }
                throw error;
            }

            navigate('/');
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
                        ELECTRIX
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Empresa de Servicio Eléctrico
                    </p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="rut">RUT / Usuario</Label>
                            <Input
                                id="rut"
                                name="rut"
                                type="text"
                                placeholder="12.345.678-9"
                                required
                                value={rut}
                                onChange={(e) => setRut(formatRut(e.target.value))}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Ingresa tu contraseña"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </Button>

                    <div className="text-center text-sm">
                        <Link to="/register" className="text-primary hover:underline">
                            ¿No tienes cuenta? Regístrate
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
