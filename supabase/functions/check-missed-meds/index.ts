
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const EMAILJS_SERVICE_ID = Deno.env.get("EMAILJS_SERVICE_ID");
const EMAILJS_TEMPLATE_ID = Deno.env.get("EMAILJS_TEMPLATE_ID");
const EMAILJS_PUBLIC_KEY = Deno.env.get("EMAILJS_PUBLIC_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const start = performance.now();
    
    // 1. Fetch ALL relevant profiles (alerts enabled)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, caretaker_email, alert_delay")
      .not("caretaker_email", "is", null)
      .not("alert_delay", "is", null);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ success: true, processed: 0, time_ms: performance.now() - start }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const now = new Date();
    
    // FIX: Handle Timezone (Assuming IST +05:30 based on user location)
    // In a production app, we should store user's timezone in 'profiles'.
    const TIMEZONE_OFFSET_STR = "+05:30"; 
    
    // Calculate 'todayStr' based on User's Timezone, not UTC
    // We can use Intl (if available) or manual offset
    // Manual Offset for IST: UTC + 5.5h
    const userNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = userNow.toISOString().split("T")[0]; // YYYY-MM-DD in IST

    const processedResults = [];

    // Process profiles in chunks
    const processProfilePromises = profiles.map(async (profile) => {
        if (!profile.alert_delay) return;

        // 2. Fetch Meds AND Logs for this user in parallel
        const [medsResult, logsResult] = await Promise.all([
            supabase
                .from("medications")
                .select("*")
                .eq("user_id", profile.id)
                .or(`target_date.is.null,target_date.eq.${todayStr}`),
            supabase
                .from("medication_logs")
                .select("*")
                .eq("user_id", profile.id)
                .eq("date", todayStr)
        ]);

        if (medsResult.error || logsResult.error) {
            console.error(`Error processing user ${profile.id}`, medsResult.error, logsResult.error);
            return;
        }

        const meds = medsResult.data || [];
        const logs = logsResult.data || [];
        
        // Map logs for quick lookup
        const logsMap = new Map();
        logs.forEach(log => logsMap.set(log.medication_id, log));

        const alertsToSend = [];

        for (const med of meds) {
             // Calculate Alert Trigger Time CORRECTLY
             // reminder_time is "HH:MM" in User's Local Time
             // We construct an ISO string with the Offset to get the correct UTC timestamp
             
            const reminderIso = `${todayStr}T${med.reminder_time}:00${TIMEZONE_OFFSET_STR}`;
            const reminderDate = new Date(reminderIso);
            
            // If date is invalid (backup)
            if (isNaN(reminderDate.getTime())) {
                console.error("Invalid date parsed", reminderIso);
                continue;
            }

            let delayMinutes = 0;
            if (profile.alert_delay === "10 min") delayMinutes = 10;
            if (profile.alert_delay === "30 min") delayMinutes = 30;
            if (profile.alert_delay === "1 hour") delayMinutes = 60;
            if (profile.alert_delay === "2 hours") delayMinutes = 120;

            const alertTime = new Date(reminderDate.getTime() + delayMinutes * 60000);
            
            // Debug Log (Viewable in Supabase logs)
            // console.log(`Med: ${med.name}, Reminder: ${reminderIso}, AlertTime: ${alertTime.toISOString()}, Now: ${now.toISOString()}`);

            // If alert time passed
            if (now > alertTime) {
                const log = logsMap.get(med.id);
                
                // Logic: Send if (No log) OR (Log exists AND taken=false AND alert_sent=false)
                let shouldSend = false;
                let logAction = null; // 'create' or 'update'

                if (!log) {
                    shouldSend = true;
                    logAction = 'create';
                } else if (log.taken === false && log.alert_sent === false) {
                    shouldSend = true;
                    logAction = 'update';
                    logAction = { id: log.id, action: 'update' };
                }

                if (shouldSend) {
                     alertsToSend.push({ med, logAction });
                }
            }
        }

        // 3. Process Alerts for this user
        if (alertsToSend.length > 0) {
            // Process emails in parallel
            await Promise.all(alertsToSend.map(async ({ med, logAction }) => {
                 // Send Email using EmailJS REST API
                 if (EMAILJS_SERVICE_ID && EMAILJS_PUBLIC_KEY && EMAILJS_TEMPLATE_ID) {
                    try {
                        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                service_id: EMAILJS_SERVICE_ID,
                                template_id: EMAILJS_TEMPLATE_ID,
                                user_id: EMAILJS_PUBLIC_KEY,
                                template_params: {
                                    caretaker_email: profile.caretaker_email,
                                    medicine_name: med.name,
                                    patient_name: profile.full_name || "Patient",
                                    schedule_time: med.reminder_time
                                },
                            }),
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`EmailJS API error: ${response.status} ${errorText}`);
                        }

                        processedResults.push({ user: profile.id, med: med.name, status: "sent" });
                    } catch (e) {
                         console.error("Email failed", e);
                         return; // Don't update DB if email failed
                    }
                 } else {
                     console.log("Missing EmailJS Configuration");
                     processedResults.push({ user: profile.id, med: med.name, status: "skipped_missing_config" });
                 }

                 // Update DB
                 if (logAction === 'create') {
                     await supabase.from("medication_logs").insert({
                            user_id: profile.id,
                            medication_id: med.id,
                            date: todayStr,
                            taken: false,
                            alert_sent: true
                     });
                 } else if (logAction && logAction.action === 'update') {
                     await supabase.from("medication_logs").update({ alert_sent: true }).eq("id", logAction.id);
                 }
            }));
        }
    });

    await Promise.all(processProfilePromises);

    return new Response(JSON.stringify({ success: true, processed: processedResults, time_ms: performance.now() - start }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
