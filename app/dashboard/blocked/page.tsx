'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ShieldOff, Trash2 } from 'lucide-react';

export default function BlockedPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const profileId = searchParams.get('profileId');
    const [blockedList, setBlockedList] = useState<any[]>([]);

    const loadBlocked = async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { data } = await sb.from('BlockList').select('*, blocked:Profile!blockedId(name, id)').eq('blockerId', profileId);
        // Note: The select query uses !blockedId to hint the relation if necessary, or just standard join. 
        // If 'blocked:Profile(name, id)' fails due to relationship naming, check Supabase foreign keys.
        // Assuming 'blockedId' references 'Profile.id'.
        setBlockedList(data || []);
    };

    useEffect(() => { if (profileId) loadBlocked(); }, [profileId]);

    const unblock = async (id: string) => {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.from('BlockList').delete().eq('id', id);
        loadBlocked();
    };

    return (
        <main className="min-h-screen bg-black text-slate-300 font-mono p-12">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-xs mb-8 uppercase font-bold text-slate-600 hover:text-cyan-400">
                <ChevronLeft size={16} /> Dashboard
            </button>

            <h1 className="text-3xl font-black text-white italic mb-8 uppercase tracking-tighter">Zones de Bannissement</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blockedList.length > 0 ? blockedList.map((item: any) => (
                    <div key={item.id} className="p-6 bg-slate-900/50 border border-red-900/20 rounded-2xl flex justify-between items-center">
                        <div>
                            <p className="text-white font-bold">{item.blocked?.name || 'Clone Inconnu'}</p>
                            <p className="text-[10px] text-slate-600">ID: {item.blockedId.slice(0, 8)}</p>
                        </div>
                        <button onClick={() => unblock(item.id)} className="p-3 bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                            <ShieldOff size={18} />
                        </button>
                    </div>
                )) : (
                    <div className="text-slate-600 text-sm italic">Aucun clone bloqué.</div>
                )}
            </div>
        </main>
    );
}
