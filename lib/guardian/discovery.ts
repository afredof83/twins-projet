import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function findInternalAgent(myProfileId: string, userId: string) {
    // SECURITY: Verify profile ownership first
    const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', myProfileId)
        .single();
    
    if (!profile || profile.user_id !== userId) {
        throw new Error('Unauthorized: Profile does not belong to user.');
    }

    // 2. Recherche plus souple (insensible à la casse)
    const { data: partner, error } = await supabase
        .from('profiles')
        .select('id, name, bio')
        .neq('id', myProfileId)
        .ilike('name', '%user%') // 'ilike' ignore la casse et cherche "user" n'importe où
        .maybeSingle();

    if (error) return null;
    return partner;
}
