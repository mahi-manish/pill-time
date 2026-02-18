# Deploy Script for PillTime Edge Functions

# 1. Login to Supabase (if not already logged in)
# npx supabase login

# 2. Deploy the function
# This command deploys the 'check-missed-meds' function to your linked Supabase project.
npx supabase functions deploy check-missed-meds --no-verify-jwt

# 3. Set Secrets (Replace with your actual keys)
# npx supabase secrets set RESEND_API_KEY="re_123456789"
# (Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically set by the platform)

echo "Deployment command executed. If you haven't linked your project yet, run 'npx supabase link' first."
