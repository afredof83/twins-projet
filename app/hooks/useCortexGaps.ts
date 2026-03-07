import useSWR from 'swr';
import { getApiUrl } from '@/lib/api-config';
import { createClient } from '@/lib/supabaseBrowser';

const fetcher = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const headers: any = { 'Content-Type': 'application/json' };
    if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(getApiUrl('/api/cortex'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'analyzeGaps' })
    });
    return res.json();
};

export function useCortexGaps() {
    const isLoginPage = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup');

    const { data, error, isLoading, mutate } = useSWR(
        isLoginPage ? null : 'cortex-gaps',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        gaps: data,
        isLoading,
        isError: error,
        mutate
    };
}