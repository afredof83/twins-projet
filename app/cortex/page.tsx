"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CortexPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState({ title: '', content: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Charger les notes
    const fetchNotes = () => {
        fetch('/api/cortex')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setNotes(data);
            });
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    // Sauvegarder une note
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.title) return;

        setIsSaving(true);
        const response = await fetch('/api/cortex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newNote)
        });

        const result = await response.json();
        if (result.success) {
            setNewNote({ title: '', content: '' }); // On vide le formulaire
            fetchNotes(); // On rafraîchit la liste
        }
        setIsSaving(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-md mx-auto">

                {/* Navigation retour */}
                <div className="mb-6">
                    <Link href="/" className="text-gray-400 hover:text-white transition">
                        ← Retour au Dashboard
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-2">🧠 Mon Cortex</h1>
                <p className="text-gray-400 mb-8">Dépose ici tes idées, liens et réflexions pour ton Agent.</p>

                {/* Formulaire d'ajout rapide */}
                <form onSubmit={handleSave} className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-8 space-y-4">
                    <input
                        type="text"
                        placeholder="Titre de la note ou idée..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        value={newNote.title}
                        onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                        required
                    />
                    <textarea
                        placeholder="Détails, lien URL, contexte..."
                        rows={3}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        value={newNote.content}
                        onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                    />
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-colors"
                    >
                        {isSaving ? 'Enregistrement...' : '+ Ajouter à la mémoire'}
                    </button>
                </form>

                {/* Liste des notes existantes */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Mémoire à long terme</h2>
                    {notes.length > 0 ? (
                        notes.map((note) => (
                            <div key={note.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                                <h3 className="font-bold text-lg mb-1">{note.title}</h3>
                                {note.content && <p className="text-gray-400 text-sm whitespace-pre-wrap">{note.content}</p>}
                                <p className="text-xs text-gray-500 mt-3">
                                    Enregistré le {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-6 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                            Le Cortex est vide. Ajoute ta première pensée !
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
