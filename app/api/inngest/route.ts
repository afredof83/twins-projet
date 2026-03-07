export const dynamic = 'force-static';
import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processRadarMatch } from "../../../inngest/functions";

// ⚡ ANTIGRAVITY: C'est ici que Next.js "écoute" Inngest
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        processRadarMatch,
    ],
});
