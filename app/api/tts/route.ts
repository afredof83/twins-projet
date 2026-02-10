import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });
        if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 });

        // ID de voix "Rachel" (Défaut ElevenLabs) ou votre ID perso
        const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error("ElevenLabs Error:", err);
            throw new Error("Erreur TTS");
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
            },
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}