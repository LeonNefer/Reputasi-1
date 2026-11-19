import { supabaseConfig } from "./supabase-config.js";

export const isSupabaseConfigured = Boolean(
  supabaseConfig.url.trim() && supabaseConfig.publishableKey.trim()
);

let clientPromise;

export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2.102.0").then(({ createClient }) =>
      createClient(supabaseConfig.url.trim(), supabaseConfig.publishableKey.trim(), {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    );
  }
  return clientPromise;
}

export function isDemoSession() {
  return !isSupabaseConfigured && sessionStorage.getItem("ruang-tumbuh-demo") === "true";
}
