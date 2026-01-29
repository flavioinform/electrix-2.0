import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Briefcase, DollarSign, LogOut, User } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export default function Layout() {
    const { signOut, profile, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const role = profile?.role || user?.user_metadata?.role;

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { name: 'Flujo de Trabajo', path: '/workflow', icon: Briefcase },
        { name: 'Flujo de Caja', path: '/cashflow', icon: DollarSign },
        // Only show Team Management to Supervisors (we filter next)
        { name: 'Equipo', path: '/team', icon: User, allowedRoles: ['supervisor'] },
    ];

    /* 
      If client, maybe they only see Project View. 
      But for now assuming Supervisor/Trabajador get this layout.
      I will handle Client specific layout in App.tsx or checking role here.
    */

    // Hide nav items if client
    const showNav = role !== 'cliente';

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="border-b border-border bg-card shadow-sm sticky top-0 z-50">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20">
                            <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                                ELECTRIX
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                {role || 'Empresa'}
                            </p>
                        </div>
                    </div>

                    {showNav && (
                        <nav className="hidden md:flex items-center gap-2">
                            {navItems.map((item) => {
                                // Check role permission
                                if (item.allowedRoles && !item.allowedRoles.includes(role || '')) {
                                    return null;
                                }

                                const Icon = item.icon;
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <Link key={item.path} to={item.path}>
                                        <Button
                                            variant={isActive ? 'default' : 'ghost'}
                                            className={cn(
                                                "gap-2",
                                                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {item.name}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline-block">{profile?.full_name || profile?.rut}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                            className="text-muted-foreground hover:text-destructive gap-1"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Cerrar sesión</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6 fade-in">
                <div className="mb-6 md:hidden flex justify-center gap-2">
                    {/* Mobile Nav */}
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link key={item.path} to={item.path} className="flex-1">
                                <Button
                                    variant={isActive ? 'default' : 'secondary'}
                                    className="w-full gap-2"
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </Button>
                            </Link>
                        );
                    })}
                </div>
                <Outlet />
            </main>
        </div>
    );
}
