import { createClient } from '@supabase/supabase-js';

// On récupère les clés dans les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Il manque les clés Supabase dans le fichier .env !");
}

// On crée et exporte le client
export const supabase = createClient(supabaseUrl, supabaseKey);
