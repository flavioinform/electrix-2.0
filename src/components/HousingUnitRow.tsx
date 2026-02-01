import React, { useState } from 'react';
import type { HousingUnit } from '../types';
import { Button } from './Button';
import { MessageSquare, Image as ImageIcon, ChevronDown, ChevronUp, Save, Upload, X, Loader2, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Label } from './Label';
import { Input } from './Input';

const STATUS_OPTIONS = [
    "Factibilidad", "TE1", "Empalme", "TDA",
    "Canalización", "Cableado", "Bomba de agua", "Alimentador de bomba",
    "Soldadura", "Artefactado", "Extractores", "Pruebas eléctricas", "Rotulado"
];

interface HousingUnitRowProps {
    unit: HousingUnit;
    onUpdate: (unit: HousingUnit) => void;
    onDelete: () => void;
}

export function HousingUnitRow({ unit, onUpdate, onDelete }: HousingUnitRowProps) {
    const [expanded, setExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'none' | 'comments' | 'images'>('none');
    const [comment, setComment] = useState(unit.comments || '');
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(unit.name);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const toggleStatus = async (option: string) => {
        const newStatus = { ...unit.status, [option]: !unit.status[option] };

        // Optimistic update
        const updatedUnit = { ...unit, status: newStatus };
        onUpdate(updatedUnit);

        try {
            await supabase
                .from('housing_units')
                .update({ status: newStatus })
                .eq('id', unit.id);
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleSaveComment = async () => {
        setIsSavingComment(true);
        try {
            const { error } = await supabase
                .from('housing_units')
                .update({ comments: comment })
                .eq('id', unit.id);

            if (error) throw error;
            onUpdate({ ...unit, comments: comment });
            setActiveTab('none');
        } catch (error) {
            console.error("Error saving comment:", error);
            alert("Error al guardar el comentario");
        } finally {
            setIsSavingComment(false);
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${unit.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('housing-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('housing-images')
                .getPublicUrl(filePath);

            // 3. Update Database
            const currentImages = unit.images || [];
            const newImages = [...currentImages, publicUrl];

            const { error: dbError } = await supabase
                .from('housing_units')
                .update({ images: newImages })
                .eq('id', unit.id);

            if (dbError) throw dbError;

            onUpdate({ ...unit, images: newImages });
        } catch (error: any) {
            console.error("Error uploading image:", error);
            alert(`Error al subir imagen: ${error.message || error}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteImage = async (imageUrl: string) => {
        if (!confirm("¿Estás seguro de eliminar esta imagen?")) return;

        try {
            const newImages = (unit.images || []).filter(img => img !== imageUrl);

            // Update Database (we're strictly updating the array reference, managing storage deletion is separate/optional for now)
            const { error } = await supabase
                .from('housing_units')
                .update({ images: newImages })
                .eq('id', unit.id);

            if (error) throw error;
            onUpdate({ ...unit, images: newImages });
        } catch (error) {
            console.error("Error deleting image:", error);
            alert("Error al eliminar la imagen");
        }
    };

    const handleSaveName = async () => {
        if (!editName || editName === unit.name) {
            setIsEditingName(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('housing_units')
                .update({ name: editName })
                .eq('id', unit.id);

            if (error) throw error;

            onUpdate({ ...unit, name: editName });
            setIsEditingName(false);
        } catch (error: any) {
            console.error("Error updating unit name:", error);
            alert("Error al actualizar el nombre: " + error.message);
        }
    };

    return (
        <div className="border rounded-lg bg-card/50 border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex-1 flex items-center gap-2">
                    {isEditingName ? (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-9 w-64"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleSaveName} className="h-9 w-9 p-0 bg-green-600 hover:bg-green-700">
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                                setIsEditingName(false);
                                setEditName(unit.name);
                            }} className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-foreground">{unit.name}</h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setIsEditingName(true)}
                                title="Editar nombre"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={onDelete}
                                title="Eliminar vivienda"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {STATUS_OPTIONS.map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer group">
                                <div className={cn(
                                    "w-5 h-5 rounded border border-input transition-colors flex items-center justify-center",
                                    unit.status[option] ? "bg-primary border-primary" : "bg-transparent group-hover:border-primary"
                                )}>
                                    {unit.status[option] && <div className="w-2.5 h-2.5 bg-primary-foreground rounded-[1px]" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={!!unit.status[option]}
                                    onChange={() => toggleStatus(option)}
                                />
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors select-none">
                                    {option}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="flex flex-col gap-4 pt-2 border-t border-border/50">
                        <div className="flex gap-4">
                            <Button
                                variant={activeTab === 'comments' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab(activeTab === 'comments' ? 'none' : 'comments')}
                                className="gap-2"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Comentarios
                            </Button>
                            <Button
                                variant={activeTab === 'images' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTab(activeTab === 'images' ? 'none' : 'images')}
                                className="gap-2"
                            >
                                <ImageIcon className="h-4 w-4" />
                                Imágenes ({unit.images?.length || 0})
                            </Button>
                        </div>

                        {activeTab === 'comments' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Comentarios de la unidad</Label>
                                <textarea
                                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-smring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Escribe detalles importantes sobre esta unidad..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleSaveComment} disabled={isSavingComment}>
                                        {isSavingComment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Guardar Comentario
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'images' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <Label>Galería de Imágenes</Label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleUploadImage}
                                            disabled={isUploading}
                                        />
                                        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                            Subir Imagen
                                        </Button>
                                    </div>
                                </div>

                                {(!unit.images || unit.images.length === 0) ? (
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                                        No hay imágenes subidas
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {unit.images.map((url, idx) => (
                                            <div key={idx} className="group relative aspect-square rounded-md overflow-hidden border border-border bg-black/20">
                                                <img
                                                    src={url}
                                                    alt={`Evidencia ${idx + 1}`}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    onClick={() => window.open(url, '_blank')}
                                                />
                                                <button
                                                    onClick={() => handleDeleteImage(url)}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
