import useSWR from 'swr';

// Le fetcher standard pour SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCortexGaps() {
    const { data, error, isLoading, mutate } = useSWR(
        '/api/cortex/analyze-gaps',
        fetcher,
        {
            revalidateOnFocus: false, // Empêche de rappeler l'API Mistral juste en changeant d'onglet
            dedupingInterval: 60000,  // Déduplique toutes les requêtes identiques pendant 60 secondes
        }
    );

    return {
        gaps: data,
        isLoading,
        isError: error,
        mutate // Permettra de forcer un rafraîchissement après que l'utilisateur ait répondu
    };
}
