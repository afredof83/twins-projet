import { NextRequest, NextResponse } from 'next/server';
import { vectorStore } from '@/lib/vector/supabase-pgvector';
import { embeddingService } from '@/lib/vector/embedding-service';
// --- SOLUTION ULTIME POUR PDF-PARSE ---
// On utilise 'require' pour forcer le chargement, et on ignore l'erreur TS
// @ts-ignore
const pdf = require('pdf-parse');
// --------------------------------------

export async function POST(req: NextRequest) {
    try {
        let textContent = "";
        let profileId = "";
        let memoryType = "MEMORY"; // Default type
        let fileName = "";

        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            // --- GESTION DES REQUÊTES JSON (Cortex & Journal) ---
            const json = await req.json();
            textContent = json.text;
            profileId = json.profileId;
            if (json.type) memoryType = json.type;

        } else if (contentType.includes("multipart/form-data")) {
            // --- GESTION DES FICHIERS (Upload Drag & Drop) ---
            const formData = await req.formData();
            const file = formData.get('file') as File;
            profileId = formData.get('profileId') as string;

            if (!file || !profileId) {
                return NextResponse.json({ error: "Fichier ou ID manquant" }, { status: 400 });
            }

            fileName = file.name;
            console.log(`📂 Réception fichier: ${file.name} (${file.type})`);

            // DÉTECTION DU TYPE DE FICHIER
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const data = await pdf(buffer);
                textContent = data.text;
                // Nettoyage basique
                textContent = textContent.replace(/\n\s*\n/g, '\n').trim();
                console.log(`📄 PDF extrait : ${textContent.length} caractères.`);
            } else {
                textContent = await file.text();
            }
        } else {
            return NextResponse.json({ error: "Content-Type non supporté" }, { status: 400 });
        }

        // --- VÉRIFICATION & INSERTION ---
        if (!textContent || textContent.length < 5) {
            return NextResponse.json({ error: "Contenu vide ou illisible" }, { status: 400 });
        }

        // --- DÉCOUPAGE (Chunking) ---
        // On découpe si c'est très long (ex: PDF), sinon ça fait un seul chunk
        const chunks = chunkText(textContent, 1000);
        console.log(`🔪 Découpé en ${chunks.length} morceaux.`);

        // --- SAUVEGARDE EN MÉMOIRE ---
        let count = 0;
        for (const chunk of chunks) {
            const embedding = await embeddingService.generateEmbedding(chunk);

            const tags = ['upload'];
            if (fileName) tags.push('file', fileName);
            if (memoryType !== 'MEMORY') tags.push(memoryType.toLowerCase());

            await vectorStore.addMemory({
                content: chunk,
                embedding: embedding,
                tags: tags,
                type: memoryType as any, // On passe le type (PRIVATE/PUBLIC/MEMORY)
                profileId: profileId
            });
            count++;
        }

        return NextResponse.json({
            success: true,
            chunks: count,
            message: `J'ai mémorisé ${count} éléments.`
        });

    } catch (error: any) {
        console.error("🔥 Ingest Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Petite fonction utilitaire pour couper le texte
function chunkText(text: string, size: number): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}