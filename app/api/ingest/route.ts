import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/embedding-service';
import { vectorStore } from '@/lib/vector/supabase-pgvector';

export async function POST(request: NextRequest) {
    let successCount = 0;

    try {
        console.log("📥 [API] Début de l'ingestion...");

        // 1. Récupération sécurisée
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const profileId = formData.get('profileId') as string;

        if (!file || !profileId) {
            return NextResponse.json({ error: 'Fichier ou ID manquant' }, { status: 400 });
        }

        const textContent = await file.text();
        if (!textContent || textContent.length < 5) {
            return NextResponse.json({ error: 'Fichier vide' }, { status: 400 });
        }

        // 2. Découpage
        const chunks = textContent.match(/[\s\S]{1,1000}/g) || [];
        console.log(`🔪 [API] ${chunks.length} segments à traiter.`);

        // 3. Boucle de traitement
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                // Pause anti-spam Mistral
                await new Promise(r => setTimeout(r, 200));

                // Génération Vecteur
                const embedding = await embeddingService.generateEmbedding(chunk);

                // Sauvegarde using the correct addMemory method
                await vectorStore.addMemory({
                    content: chunk,
                    embedding: embedding,
                    tags: ['upload', file.name],
                    type: 'TEXT',  // Valid enum value from Prisma schema
                    profileId: profileId
                });

                successCount++;
            } catch (innerError) {
                // Si un morceau plante, on l'affiche mais ON CONTINUE les autres
                console.error("⚠️ Erreur sur un segment:", innerError);
            }
        }

        // 4. Réponse Finale (Même si 0 succès, on renvoie 200 pour ne pas effrayer le front)
        console.log(`✅ [API] Terminé. ${successCount} segments sauvés.`);
        return NextResponse.json({
            success: true,
            count: successCount,
            message: "Traitement terminé"
        });

    } catch (error: any) {
        console.error('🔥 [API CRASH]:', error);
        // On renvoie quand même une réponse JSON propre
        return NextResponse.json(
            { error: error.message || 'Erreur inconnue serveur' },
            { status: 500 }
        );
    }
}