import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const myId = searchParams.get('myId');
        const partnerId = searchParams.get('partnerId');

        if (!myId || !partnerId) {
            return NextResponse.json({ error: "Missing IDs" }, { status: 400 });
        }

        // Requête simplifiée : on cherche une négociation entre les deux participants
        // On sélectionne summary et verdict. On utilise createdAt pour le tri.
        const { data, error } = await supabase
            .from('Negotiation')
            .select('summary, verdict, createdAt')
            .or(`initiatorId.eq.${myId},receiverId.eq.${myId}`)
            .filter('initiatorId', 'in', `(${myId},${partnerId})`)
            .filter('receiverId', 'in', `(${myId},${partnerId})`)
            // Note: Assuming 'createdAt' exists. If not, we might need to change it back or ensure the table has it. 
            // The user prompt specifically asked for 'createdAt'.
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Supabase Error (Report Fetch):", error);
            throw error;
        }

        return NextResponse.json({ report: data });
    } catch (e: any) {
        console.error("Report Route Crash:", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
