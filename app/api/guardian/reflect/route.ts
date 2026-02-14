import { NextResponse } from 'next/server';
import { guardianSelfReflection } from '@/lib/guardian/brain';

export async function POST(req: Request) {
    try {
        const { profileId } = await req.json();

        // Le Gardien réfléchit...
        const insight = await guardianSelfReflection(profileId);

        return NextResponse.json({ insight });
    } catch (error: any) {
        console.error("❌ Erreur Gardien:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
