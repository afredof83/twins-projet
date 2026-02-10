import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';
import PDFParser from 'pdf2json'; // Nouvelle librairie

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// Fonction utilitaire pour transformer pdf2json en Promesse (Async/Await)
function parsePDFBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser(null, true); // true = Texte brut

        parser.on("pdfParser_dataError", (errData: any) => {
            reject(new Error(errData.parserError));
        });

        parser.on("pdfParser_dataReady", (pdfData: any) => {
            // Extraction du texte brut depuis le JSON généré
            const text = parser.getRawTextContent();
            resolve(text);
        });

        parser.parseBuffer(buffer);
    });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const profileId = formData.get('profileId') as string;

        if (!file || !profileId) {
            return NextResponse.json({ error: "Fichier ou ID manquant" }, { status: 400 });
        }

        console.log(`[SENSOR] Réception fichier: ${file.name} (${file.type})`);

        let textContent = "";

        // 1. EXTRACTION PDF (Via PDF2JSON)
        if (file.type === "application/pdf") {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Appel de notre fonction wrapper
                textContent = await parsePDFBuffer(buffer);

            } catch (err: any) {
                console.error("Erreur PDF2JSON:", err);
                return NextResponse.json({ error: "Lecture PDF impossible: " + err.message }, { status: 500 });
            }
        } else {
            // Fichiers texte
            textContent = await file.text();
        }

        // Nettoyage et Validation
        // pdf2json laisse parfois des caractères de saut de page (----------------Page (0) Break----------------)
        textContent = textContent.replace(/----------------Page \(\d+\) Break----------------/g, '\n');
        textContent = textContent.replace(/\s+/g, ' ').trim();

        if (!textContent || textContent.length < 5) {
            return NextResponse.json({ error: "Fichier vide ou illisible." }, { status: 400 });
        }

        // 2. DÉCOUPAGE
        const chunks = textContent.match(/[\s\S]{1,2000}/g) || [textContent];
        let savedCount = 0;

        console.log(`[SENSOR] Extraction OK (${textContent.length} chars). ${chunks.length} fragments à traiter.`);

        // 3. ENCODAGE
        for (const chunk of chunks) {
            const embeddingResponse = await mistral.embeddings.create({
                model: "mistral-embed",
                inputs: [chunk],
            });

            if (!embeddingResponse.data || !embeddingResponse.data[0]) continue;
            const embedding = embeddingResponse.data[0].embedding;

            const { error } = await supabase.from('Memory').insert({
                profileId,
                content: `[DOC: ${file.name}] ${chunk}`,
                type: 'document',
                source: 'visual_sensor',
                embedding: embedding
            });

            if (!error) savedCount++;
        }

        return NextResponse.json({ success: true, fragments: savedCount });

    } catch (error: any) {
        console.error("[SENSOR ERROR]", error);
        return NextResponse.json({ error: error.message || "Erreur inconnue" }, { status: 500 });
    }
}