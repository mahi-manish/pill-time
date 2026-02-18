
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
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
      .select("id, caretaker_email, alert_delay")
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
                 // Send Email
                 if (RESEND_API_KEY) {
                    try {
                        await fetch("https://api.resend.com/emails", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${RESEND_API_KEY}`,
                            },
                            body: JSON.stringify({
                                from: "PillTime <onboarding@resend.dev>",
                                to: [profile.caretaker_email],
                                subject: `🔴 Missed Medication Alert: ${med.name}`,
                                html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <style>
                                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
                                        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
                                        .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                                        .content { padding: 20px; }
                                        .med-card { background-color: #feba7433; border: 1px solid #fdba74; padding: 15px; border-radius: 8px; margin: 15px 0; }
                                        .label { font-size: 12px; text-transform: uppercase; color: #666; font-weight: bold; }
                                        .value { font-size: 18px; font-weight: 600; color: #000; }
                                        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <div class="header">
                                            <h1 style="margin:0;">⚠️ Missed Medication Alert</h1>
                                        </div>
                                        <div class="content">
                                            <p>Hello,</p>
                                            <p>This is an automated alert to inform you that the following medication has <strong>not been marked as taken</strong> by the scheduled time.</p>
                                            
                                            <div class="med-card">
                                                <div>
                                                    <span class="label">Medication</span><br>
                                                    <span class="value">${med.name}</span>
                                                </div>
                                                <div style="margin-top: 10px;">
                                                    <span class="label">Scheduled Time</span><br>
                                                    <span class="value">${med.reminder_time}</span>
                                                </div>
                                                <div style="margin-top: 10px;">
                                                    <span class="label">Patient ID</span><br>
                                                    <span class="value">${profile.id}</span>
                                                </div>
                                            </div>

                                            <p>Please check on the patient ensuring they take their medication.</p>
                                        </div>
                                        <div class="footer">
                                            <p>Sent via PillTime Alert System</p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                                `,
                            }),
                        });
                        processedResults.push({ user: profile.id, med: med.name, status: "sent" });
                    } catch (e) {
                         console.error("Email failed", e);
                         return; // Don't update DB if email failed
                    }
                 } else {
                     console.log("No Resend Key");
                     processedResults.push({ user: profile.id, med: med.name, status: "skipped_no_key" });
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
