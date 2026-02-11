import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { requestId, status } = await req.json();
        const supabase = await createClient();

        // 1. Mettre à jour la requête
        const { data: request, error } = await supabase
            .from('AccessRequest')
            .update({ status })
            .eq('id', requestId)
            .select()
            .single();

        if (error || !request) throw new Error("Request not found or update failed");

        // 2. Envoyer le message automatique dans la messagerie DirectMessage
        // Note: status 'approved' vs 'declined'
        const messageContent = status === 'approved'
            ? `✅ [AUTO] J'ai accepté ta demande sur le sujet "${request.topic}". On peut en discuter.`
            : `❌ [AUTO] J'ai refusé la discussion sur le sujet "${request.topic}".`;

        await supabase.from('DirectMessage').insert([{
            sender_id: request.provider_id,
            receiver_id: request.requester_id,
            content: messageContent,
            created_at: new Date().toISOString()
        }]);

        return NextResponse.json({ status: 'done', requestStatus: status });
    } catch (error: any) {
        console.error("Decision Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
