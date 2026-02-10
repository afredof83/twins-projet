import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Mistral } from '@mistralai/mistralai';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

export async function POST(req: Request) {
    try {
        const { content, type, profileId } = await req.json();

        const embeddingResponse = await mistral.embeddings.create({
            model: "mistral-embed",
            inputs: [content],
        });

        const { error } = await supabase
            .from('Memory')
            .insert({
                profileId,
                content,
                type: type || 'thought',
                embedding: embeddingResponse.data[0].embedding,
                source: 'manual_input'
            });

        if (error) throw error;
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
