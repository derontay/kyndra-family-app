import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Backwards-compatible export for existing imports like:
// import { supabase } from "@/lib/supabaseClient";
export const supabase = createClient();