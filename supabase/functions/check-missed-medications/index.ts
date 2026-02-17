import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get all medications for all users
    // Note: In a real app with many users, you'd shard this or process in batches.
    const { data: medications, error: medsError } = await supabaseClient
      .from("medications")
      .select("*, profiles(email)");

    if (medsError) throw medsError;

    if (!medications || medications.length === 0) {
      return new Response(JSON.stringify({ message: "No medications found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const emailsSent = [];

    // 2. Check logs for today
    for (const med of medications) {
        const { data: log } = await supabaseClient
            .from("medication_logs")
            .select("*")
            .eq("medication_id", med.id)
            .eq("date", today)
            .single();

        // If no log exists or taken is false
        if (!log || !log.taken) {
            // Trigger email
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            if (!resendApiKey) {
                console.error("No RESEND_API_KEY found");
                continue;
            }

            const resend = new Resend(resendApiKey);

            // Access email from joined profile
            // Note: profiles needs to be an object or array depending on relationship.
            // Assuming 1:1 relationship and fetch matches structure.
            // But select results might wrap profiles in array if not single?
            // "profiles(email)" in select with user_id fk should return obj if using references properly.
            // Or we just fetch email from auth.users via admin api, but simpler to join profile.
            
            const userEmail = med.profiles?.email; 

            if (userEmail) {
                try {
                    await resend.emails.send({
                        from: "Medication Reminder <onboarding@resend.dev>",
                        to: userEmail,
                        subject: `Missed Medication: ${med.name}`,
                        html: `<p>You have not marked your medication <strong>${med.name}</strong> as taken today (${today}). Please take it as prescribed.</p>`,
                    });
                    emailsSent.push({ med: med.name, user: userEmail });
                } catch (emailError) {
                    console.error("Failed to send email", emailError);
                }
            }
        }
    }

    return new Response(JSON.stringify({ message: "Check complete", emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
