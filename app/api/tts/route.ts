import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { text } = await request.json();
        const apiKey = process.env.ELEVENLABS_API_KEY;

        console.log("🎤 TTS Request reçue:", text?.substring(0, 20) + "...");

        if (!apiKey) {
            console.error("❌ ERREUR: Clé API ElevenLabs introuvable dans le serveur.");
            return NextResponse.json({ error: 'Clé API manquante (Vérifiez .env.local)' }, { status: 500 });
        }

        // ID de voix (Rachel)
        const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: text,
                // --- CORRECTION ICI : On utilise le modèle V2 qui est Gratuit et Meilleur ---
                model_id: "eleven_multilingual_v2",
                // --------------------------------------------------------------------------
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ ElevenLabs API Error:", JSON.stringify(errorData, null, 2));
            return NextResponse.json({ error: 'Erreur API ElevenLabs' }, { status: response.status });
        }

        console.log("✅ Audio généré avec succès, envoi au client...");
        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
            },
        });

    } catch (error: any) {
        console.error("🔥 TTS Crash:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}