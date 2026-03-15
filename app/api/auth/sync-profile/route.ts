export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClientServer } from '@/lib/supabaseScoped';

/**
 * IPSE - Auth Profile Synchronization Route
 * Called by mobile clients after login to ensure the Prisma profile exists.
 */
export async function POST(req: Request) {
    try {
        // 1. Authentification & Client Scoped (RLS Enforced)
        const { user } = await createClientServer(req);

        // 3. Prisma Profile Upsert
        // We use the ID and Email from Supabase to create or refresh the profile.
        console.log(`[SYNC-PROFILE] Syncing profile for user ${user.id} (${user.email})`);
        
        try {
          await prisma.profile.upsert({
              where: { 
                  userId_type: { 
                      userId: user.id, 
                      type: 'WORK' 
                  } 
              },
              update: {
                  updatedAt: new Date()
              },
              create: {
                  userId: user.id,
                  email: user.email!,
                  type: 'WORK',
                  name: 'Agent Furtif'
              },
          });
          console.log(`[SYNC-PROFILE] Successfully synced WORK profile for ${user.id}`);
        } catch (prismaError: any) {
          console.error("[SYNC-PROFILE] Prisma Upsert Failed:", prismaError);
          throw prismaError;
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Sync Profile Error (Full Trace):", err);
        return NextResponse.json({ 
            error: 'An internal error occurred during profile synchronization',
            details: err.message
        }, { status: 500 });
    }
}
