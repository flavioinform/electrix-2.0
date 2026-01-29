import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AppTransaction } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Label } from '../components/Label';
import { Plus, Search, Calendar, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function CashFlow() {
    const { profile } = useAuth();
    const [transactions, setTransactions] = useState<AppTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Totals
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);

    // New Transaction Form
    const [newTrans, setNewTrans] = useState({
        type: 'gasto', // default for workers mostly
        amount: '',
        category: 'Materiales',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchTransactions();
    }, [profile]); // Refetch if profile loads (usually happens once)

    const fetchTransactions = async () => {
        setLoading(true);
        // RLS will automatically filter:
        // Supervisor -> All
        // Worker -> Only 'gasto'
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (data) {
            setTransactions(data);
            calculateTotals(data);
        }
        setLoading(false);
    };

    const calculateTotals = (data: AppTransaction[]) => {
        const inc = data.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + Number(t.amount), 0);
        const exp = data.filter(t => t.type === 'gasto').reduce((acc, t) => acc + Number(t.amount), 0);
        setIncome(inc);
        setExpense(exp);
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTrans.amount || !newTrans.description) return;

        const { data, error } = await supabase.from('transactions').insert({
            type: newTrans.type,
            amount: parseFloat(newTrans.amount),
            category: newTrans.category,
            description: newTrans.description,
            date: newTrans.date,
            created_by: profile?.id
        }).select().single();

        if (data) {
            const updated = [data, ...transactions];
            setTransactions(updated);
            calculateTotals(updated);
            setShowAddModal(false);
            setNewTrans({ ...newTrans, amount: '', description: '' });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    // Role Logic
    const isSupervisor = profile?.role === 'supervisor';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="text-primary h-6 w-6" /> Flujo de Caja
                    </h1>
                    <p className="text-muted-foreground text-sm">Gestiona los ingresos y gastos de la empresa.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva transacción
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Supervisors see Ingresos & Balance. Workers might only see Expenses. */}
                {isSupervisor && (
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-2">Ingresos</span>
                        <span className="text-3xl font-bold text-green-500">{formatCurrency(income)}</span>
                    </div>
                )}

                <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-2">Gastos</span>
                    <span className="text-3xl font-bold text-red-500">{formatCurrency(expense)}</span>
                </div>

                {isSupervisor && (
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center shadow-sm">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-2">Balance</span>
                        <span className={cn("text-3xl font-bold", income - expense >= 0 ? "text-primary" : "text-destructive")}>
                            {formatCurrency(income - expense)}
                        </span>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="bg-card w-full max-w-lg rounded-xl border border-border p-6 shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold">Nueva transacción</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Tipo</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newTrans.type}
                                        onChange={e => setNewTrans({ ...newTrans, type: e.target.value })}
                                    >
                                        <option value="gasto">Gasto</option>
                                        <option value="ingreso">Ingreso</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Monto</Label>
                                    <Input
                                        type="number"
                                        value={newTrans.amount}
                                        onChange={e => setNewTrans({ ...newTrans, amount: e.target.value })}
                                        placeholder="10000"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Categoría</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newTrans.category}
                                    onChange={e => setNewTrans({ ...newTrans, category: e.target.value })}
                                >
                                    <option value="Materiales">Materiales</option>
                                    <option value="Servicios">Servicios</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Pago">Pago</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <Label>Descripción</Label>
                                <Input
                                    value={newTrans.description}
                                    onChange={e => setNewTrans({ ...newTrans, description: e.target.value })}
                                    placeholder="Detalle de la transacción"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Fecha</Label>
                                <Input
                                    type="date"
                                    value={newTrans.date}
                                    onChange={e => setNewTrans({ ...newTrans, date: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transaction Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Fecha</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Categoría</th>
                                <th className="px-6 py-3">Descripción</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No hay transacciones registradas.
                                    </td>
                                </tr>
                            )}
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-6 py-4">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                            t.type === 'ingreso' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                        )}>
                                            {t.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{t.category}</td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={t.description}>{t.description}</td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        <span className={t.type === 'ingreso' ? "text-green-500" : "text-destructive"}>
                                            {t.type === 'gasto' ? '-' : '+'}{formatCurrency(t.amount)}
                                        </span>
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
