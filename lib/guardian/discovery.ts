import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function findInternalAgent(myProfileId: string) {
    // 1. On récupère TOUT pour voir ce qui bloque
    const { data: allProfiles } = await supabase.from('Profile').select('id, name');
    console.log("📊 [DIAGNOSTIC] Profils en base :", allProfiles);

    // 2. Recherche plus souple (insensible à la casse)
    const { data: partner, error } = await supabase
        .from('Profile')
        .select('id, name, bio')
        .neq('id', myProfileId)
        .ilike('name', '%user%') // 'ilike' ignore la casse et cherche "user" n'importe où
        .maybeSingle();

    if (error) return null;
    return partner;
}
