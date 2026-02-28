import { mistralClient } from "@/lib/mistral";
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';

const mistral = mistralClient;

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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Accès refusé. Token manquant." }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
                global: { headers: { Authorization: authHeader } }
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

        // 1. EXTRACTION DU TEXTE
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === 'application/pdf') {
            try { textContent = await parsePDFBuffer(buffer); }
            catch { return NextResponse.json({ error: 'Architecture PDF corrompue.' }, { status: 500 }); }
        } else if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try { textContent = (await mammoth.extractRawText({ buffer })).value; }
            catch { return NextResponse.json({ error: 'Échec de lecture du fichier Word.' }, { status: 500 }); }
        } else {
            textContent = await file.text();
        }

        // Nettoyage radical
        textContent = textContent.replace(/----------------Page \(\d+\) Break----------------/g, '\n')
            .replace(/\0/g, '').replace(/\u0000/g, '')
            .replace(/\s+/g, ' ').trim();

        if (!textContent || textContent.length < 5) {
            return NextResponse.json({ error: 'Le fichier est vide ou illisible.' }, { status: 400 });
        }

        // 2. DÉCOUPAGE
        const chunks = textContent.match(/[\s\S]{1,2000}/g) || [textContent];
        console.log(`[SENSOR] ${chunks.length} fragment(s) à vectoriser.`);

        // 3. VECTORISATION DE MASSE (BATCHING) + BULK INSERT
        const BATCH_SIZE = 20; // On traite 20 fragments à la fois pour ménager la RAM et les limites Mistral
        let savedCount = 0;

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batchChunks = chunks.slice(i, i + BATCH_SIZE);

            // Une seule requête Mistral pour envoyer tout le batch
            const embeddingResponse = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: batchChunks,
            });

            if (!embeddingResponse.data || embeddingResponse.data.length === 0) continue;

            // Préparation du tableau d'insertion Supabase (Bulk Array)
            const memoryRecords = embeddingResponse.data.map((item, index) => ({
                id: crypto.randomUUID(),
                profile_id: profileId,
                content: `[DOC: ${file.name}] ${batchChunks[index]}`,
                type: 'document',
                source: 'cortex_dropzone',
                embedding: item.embedding,
                created_at: new Date().toISOString()
            }));

            // Une seule requête Supabase pour insérer tout le batch
            const { error } = await supabase.from('memory').insert(memoryRecords);

            if (!error) {
                savedCount += memoryRecords.length;
            } else {
                console.error("[ERREUR BDD BULK]", error);
                // Si le batch plante, on ne crashe pas tout, on continue avec le batch suivant
            }
        }

        console.log(`[SENSOR] Succès : ${savedCount} fragments vectorisés en mémoire.`);
        return NextResponse.json({ success: true, fragments: savedCount });

    } catch (error: any) {
        console.error("[SENSOR CRASH]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}