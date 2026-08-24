import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://pjzfsuweissfogfweafx.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.build_fallback";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side helper with service role for administrative / python backend bypass operations
export const getServiceSupabase = () => {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    supabaseAnonKey;
  return createClient(supabaseUrl, serviceRoleKey);
};
