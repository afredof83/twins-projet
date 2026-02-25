import { mistralClient } from "@/lib/mistral";
﻿import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

const mistral = mistralClient;

// Fonction utilitaire pour lire le PDF en texte brut
function parsePDFBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser(null, true);
        parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
        parser.on("pdfParser_dataReady", () => resolve(parser.getRawTextContent()));
        parser.parseBuffer(buffer);
    });
}

export async function POST(req: Request) {
    try {
        // 1. Extraction du Bearer token depuis le header Authorization
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json({ error: "Accès refusé. Token manquant." }, { status: 401 });
        }

        // 2. Client Supabase blindé : obéit uniquement au Bearer token, sans session propre
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: false,   // Empêche Supabase d'écraser notre Token
                    autoRefreshToken: false,
                },
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        );

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const profileId = formData.get('profileId') as string;

        if (!file || !profileId) {
            return NextResponse.json({ error: "Fichier ou ID Agent IA manquant" }, { status: 400 });
        }

        console.log(`[SENSOR] Analyse du fichier: ${file.name} (${file.type})`);
        let textContent = '';

        // 1. EXTRACTION DU TEXTE MULTI-FORMATS
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === 'application/pdf') {
            // Décodage PDF
            try {
                textContent = await parsePDFBuffer(buffer);
            } catch (err: any) {
                return NextResponse.json({ error: 'Architecture PDF corrompue.' }, { status: 500 });
            }
        } else if (
            file.name.toLowerCase().endsWith('.docx') ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            // Décodage DOCX via Mammoth
            try {
                const result = await mammoth.extractRawText({ buffer });
                textContent = result.value;
            } catch (err: any) {
                return NextResponse.json({ error: 'Échec de lecture du fichier Word.' }, { status: 500 });
            }
        } else {
            // Texte brut : TXT, CSV, MD, JSONâ€¦
            textContent = await file.text();
        }

        // Nettoyage des balises PDF + null bytes + espaces superflus
        textContent = textContent.replace(/----------------Page \(\d+\) Break----------------/g, '\n');
        textContent = textContent.replace(/\0/g, '').replace(/\u0000/g, ''); // Sécurité anti-Null Byte
        textContent = textContent.replace(/\s+/g, ' ').trim();

        if (!textContent || textContent.length < 5) {
            return NextResponse.json({ error: 'Le fichier est vide ou illisible.' }, { status: 400 });
        }

        // 2. DÉCOUPAGE (Fragments de 2000 caractères)
        const chunks = textContent.match(/[\s\S]{1,2000}/g) || [textContent];
        let savedCount = 0;

        console.log(`[SENSOR] ${chunks.length} fragment(s) à vectoriser.`);

        // 3. VECTORISATION + STOCKAGE
        for (const chunk of chunks) {
            const embeddingResponse = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: [chunk],
            });

            const embedding = embeddingResponse.data[0]?.embedding;
            if (!embedding) continue;

            // Génération d'un UUID natif (disponible nativement dans Next.js / Node.js moderne)
            const fragmentId = crypto.randomUUID();

            // Table 'memory' minuscule + colonnes snake_case
            const { error } = await supabase.from('memory').insert({
                id: fragmentId,
                profile_id: profileId,
                content: `[DOC: ${file.name}] ${chunk}`,
                type: 'document',
                source: 'cortex_dropzone',
                embedding: embedding,
                created_at: new Date().toISOString()
            });

            if (!error) savedCount++;
            else console.error("[ERREUR BDD]", error);
        }

        return NextResponse.json({ success: true, fragments: savedCount });

    } catch (error: any) {
        console.error("[SENSOR CRASH]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
