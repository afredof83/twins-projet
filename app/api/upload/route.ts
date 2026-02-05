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
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const profileId = formData.get('profileId') as string;

        if (!file || !profileId) {
            return NextResponse.json({ error: "Fichier ou ID manquant" }, { status: 400 });
        }

        console.log(`📂 Réception fichier: ${file.name} (${file.type})`);

        let textContent = "";

        // --- DÉTECTION DU TYPE ---
        if (file.type === 'application/pdf') {
            // TRAITEMENT PDF
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdf(buffer);
            textContent = data.text;

            // Nettoyage basique (retirer les multiples espaces/sauts de ligne bizarres du PDF)
            textContent = textContent.replace(/\n\s*\n/g, '\n').trim();

            console.log(`📄 PDF extrait : ${textContent.length} caractères.`);
        } else {
            // TRAITEMENT TEXTE CLASSIQUE
            textContent = await file.text();
        }

        if (!textContent || textContent.length < 10) {
            return NextResponse.json({ error: "Fichier vide ou illisible" }, { status: 400 });
        }

        // --- DÉCOUPAGE (Chunking) ---
        // Les PDF peuvent être énormes. On les découpe en morceaux de ~1000 caractères
        // pour que l'IA puisse digérer chaque partie.
        const chunks = chunkText(textContent, 1000);
        console.log(`🔪 Découpé en ${chunks.length} morceaux.`);

        // --- SAUVEGARDE EN MÉMOIRE ---
        // On boucle sur chaque morceau pour l'insérer
        let count = 0;
        for (const chunk of chunks) {
            const embedding = await embeddingService.generateEmbedding(chunk);

            await vectorStore.addMemory({
                content: chunk, // On garde le texte original
                embedding: embedding,
                tags: ['upload', 'pdf', file.name], // On ajoute le nom du fichier en tag
                type: 'MEMORY',
                profileId: profileId
            });
            count++;
        }

        return NextResponse.json({
            success: true,
            chunks: count,
            message: `J'ai lu et mémorisé ${count} passages de "${file.name}".`
        });

    } catch (error: any) {
        console.error("🔥 Upload Error:", error);
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
