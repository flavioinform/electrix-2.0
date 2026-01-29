import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Users, Key, Search, UserCog, Check } from 'lucide-react';
import type { Profile } from '../types';

export default function Team() {
    const { profile } = useAuth();
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Role Management State
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [cancelRole, setCancelRole] = useState(false);

    // Password Reset State
    const [resettingPassword, setResettingPassword] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setUsers(data);
        setLoading(false);
    };

    const handleUpdateRole = async (userId: string, newRole: 'supervisor' | 'trabajador' | 'cliente') => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            alert('Error al actualizar rol: ' + error.message);
        } else {
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setEditingRole(null);
        }
    };

    const handleResetPassword = async (userId: string) => {
        if (!newPassword || newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsResetting(true);

        // Call the RPC function (we need to ask user to create this)
        const { data, error } = await supabase.rpc('admin_reset_password', {
            target_user_id: userId,
            new_password: newPassword
        });

        if (error) {
            console.error('Error resetting password:', error);
            alert('Error al restablecer contraseña. Asegúrate de haber ejecutado el script SQL de administración.\n\nDetalle: ' + error.message);
        } else {
            alert('Contraseña actualizada correctamente.');
            setResettingPassword(null);
            setNewPassword('');
        }
        setIsResetting(false);
    };

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rut?.includes(searchTerm) ||
        u.role?.includes(searchTerm)
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="text-primary" /> Gestión de Equipo
                    </h2>
                    <p className="text-muted-foreground">Administra usuarios, roles y accesos.</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre, RUT o rol..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Users Table */}
            <div className="rounded-md border border-border bg-card">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Usuario</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">RUT</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rol</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                {user.full_name?.[0] || user.rut?.[0] || '?'}
                                            </div>
                                            {user.full_name || 'Sin Nombre'}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">{user.rut || '-'}</td>
                                    <td className="p-4 align-middle">
                                        {editingRole === user.id ? (
                                            <select
                                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value as any)}
                                                autoFocus
                                                onBlur={() => setEditingRole(null)}
                                            >
                                                <option value="supervisor">Supervisor</option>
                                                <option value="trabajador">Trabajador</option>
                                                <option value="cliente">Cliente</option>
                                            </select>
                                        ) : (
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                    ${user.role === 'supervisor' ? 'bg-primary/10 text-primary border-primary/20' :
                                                        user.role === 'cliente' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                            'bg-secondary text-secondary-foreground border-secondary-foreground/20'}`}
                                            >
                                                {user.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex justify-end gap-2">

                                            {/* Role Edit Button */}
                                            {profile?.role === 'supervisor' && user.id !== profile.id && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setEditingRole(user.id)}
                                                    title="Cambiar Rol"
                                                >
                                                    <UserCog className="h-4 w-4" />
                                                </Button>
                                            )}

                                            {/* Password Reset Button */}
                                            {profile?.role === 'supervisor' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setResettingPassword(user.id === resettingPassword ? null : user.id)}
                                                    className={user.id === resettingPassword ? "bg-destructive/10 text-destructive" : ""}
                                                    title="Restablecer Contraseña"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Password Reset Inline Form */}
                                        {resettingPassword === user.id && (
                                            <div className="mt-2 flex items-center gap-2 justify-end animate-in slide-in-from-right-5 fade-in">
                                                <Input
                                                    type="text"
                                                    placeholder="Nueva contraseña"
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    className="w-40 h-8 text-xs"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleResetPassword(user.id)}
                                                    disabled={isResetting}
                                                >
                                                    {isResetting ? '...' : <Check className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
