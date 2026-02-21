import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    // Logique de mise à jour "readAt"
    return NextResponse.json({ success: true });
}
