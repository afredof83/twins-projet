import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fonction utilitaire pour extraire les URLs d'un texte
function extractUrls(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

// L'Agent Tavily : Extraction directe de la page web (CORRIGÉ)
async function scrapeWithTavily(url: string) {
    try {
        console.log(`[TAVILY] Extraction directe de l'URL : ${url}`);
        const tavilyApiKey = process.env.TAVILY_API_KEY;

        if (!tavilyApiKey) {
            console.error("[TAVILY] Clé API manquante");
            return `[Erreur: TAVILY_API_KEY non configurée]`;
        }

        // On utilise l'API /extract de Tavily (et non plus /search)
        const response = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: tavilyApiKey,
                urls: [url], // Le endpoint extract attend un tableau d'URLs
                include_images: false
            })
        });

        const data = await response.json();

        // Tavily /extract renvoie data.results avec le contenu extrait
        if (data.results && data.results.length > 0 && data.results[0].raw_content) {
            return data.results[0].raw_content.substring(0, 6000);
        } else {
            return `[Tavily n'a pas pu extraire le contenu brut de ${url}]`;
        }
    } catch (e) {
        console.error(`[TAVILY] Erreur sur ${url}:`, e);
        return `[Impossible de lire l'URL avec Tavily]`;
    }
}

export async function POST(req: Request) {
    try {
        // 1. Vérification Auth (Zero-Trust)
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll() } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

        // 2. Récupération des données hybrides
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const textContext = formData.get('textContext') as string || '';

        if ((!file || file.size === 0) && !textContext.trim()) {
            return NextResponse.json({ error: 'Veuillez fournir un texte, une URL ou un fichier.' }, { status: 400 });
        }

        let finalPayloadForAI = "";

        // 3. Traitement du Texte et Scraping des URLs via Tavily
        if (textContext.trim()) {
            finalPayloadForAI += `--- CONTEXTE / INSTRUCTIONS UTILISATEUR ---\n${textContext}\n\n`;

            const urls = extractUrls(textContext);
            for (const url of urls) {
                const scrapedData = await scrapeWithTavily(url);
                finalPayloadForAI += `--- CONTENU DE LA PAGE WEB (${url}) ---\n${scrapedData}\n\n`;
            }
        }

        // 4. Traitement du Fichier (Optionnel)
        let fileIdForDb = null;
        if (file && file.size > 0) {
            console.log(`[CORTEX] Fichier reçu : ${file.name}`);

            // Upload Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
            const filePath = `${user.id}/${fileName}`;

            // On convertit le fichier en Buffer/ArrayBuffer pour l'upload (la méthode est simplifiée ici)
            const fileBuffer = await file.arrayBuffer();

            const { error: uploadError } = await supabase.storage.from('cortex_files').upload(filePath, fileBuffer, { contentType: file.type });
            if (uploadError) throw new Error("Erreur d'upload vers le cloud.");

            // Entrée BDD Fichier
            const archive = await prisma.fileArchive.create({
                data: {
                    profileId: user.id,
                    fileName: file.name,
                    fileUrl: filePath,
                    mimeType: file.type,
                    isAnalyzed: false
                }
            });
            fileIdForDb = archive.id;

            // Extraction du texte selon le format
            let extractedFileText = "";
            if (file.type === 'application/pdf') {
                const buffer = Buffer.from(fileBuffer);
                const pdfParse = require('pdf-extraction'); // Notre méthode blindée qui contourne Turbopack
                const pdfData = await pdfParse(buffer);
                extractedFileText = pdfData.text;
            } else if (file.type.includes('text')) {
                // file.text() might not work on all environments, using TextDecoder is safer if file.text() fails, but let's stick to the plan:
                extractedFileText = new TextDecoder("utf-8").decode(fileBuffer);
            }

            if (extractedFileText) {
                finalPayloadForAI += `--- CONTENU DU FICHIER (${file.name}) ---\n${extractedFileText.substring(0, 4000)}\n\n`;
            }
        }

        console.log("[CORTEX] Construction du payload IA terminée. Envoi à Mistral...");

        // 5. Appel à Mistral AI
        const mistralApiKey = process.env.MISTRAL_API_KEY;
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [
                    { role: 'system', content: "Tu es le jumeau numérique de l'utilisateur. Analyse les données fournies (texte libre, pages web ou documents joints). Fais-en une synthèse structurée, claire et concise pour l'ajouter à ta mémoire." },
                    { role: 'user', content: finalPayloadForAI }
                ]
            })
        });

        const mistralData = await response.json();
        const aiSummary = mistralData.choices[0].message.content;

        // 6. Sauvegarde en Base de données
        await prisma.$transaction(async (tx) => {
            await tx.cortexNote.create({
                data: {
                    profileId: user.id,
                    content: aiSummary,
                }
            });

            if (fileIdForDb) {
                await tx.fileArchive.update({
                    where: { id: fileIdForDb },
                    data: { isAnalyzed: true }
                });
            }
        });

        return NextResponse.json({ success: true, message: "Ingestion réussie" });

    } catch (error: any) {
        console.error("[CORTEX UPLOAD ERROR]", error);
        return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
    }
}
