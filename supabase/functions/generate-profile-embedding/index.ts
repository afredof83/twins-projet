import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { profileId, bio } = await req.json();

    if (!profileId || !bio) {
      throw new Error("Missing profileId or bio");
    }

    // Verify ownership of the profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("Profile")
      .select("id, userId")
      .eq("id", profileId)
      .eq("userId", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found or access denied");
    }

    // Generate embedding using OpenAI
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: bio,
        model: "text-embedding-3-small",
      }),
    });

    const embeddingData = await response.json();
    if (embeddingData.error) {
      throw new Error(`OpenAI Error: ${embeddingData.error.message}`);
    }

    const vector = embeddingData.data[0].embedding;

    // Update the profile with the vector
    // Note: We use the service role client for direct vector insertion if RLS is tricky for vectors via JS client, 
    // but here we try the user context first.
    const { error: updateError } = await supabaseClient
      .from("Profile")
      .update({ metadata_vector: vector })
      .eq("id", profileId);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
