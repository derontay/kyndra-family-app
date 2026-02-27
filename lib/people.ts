import type { SupabaseClient } from "@supabase/supabase-js";

export async function findProfileIdByEmail(
  supabase: SupabaseClient,
  email: string
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;

  const escaped = normalized
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .ilike("email", escaped)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (!data?.email) return null;
  if (data.email.toLowerCase() !== normalized) return null;
  return data.id ?? null;
}

export function updatePerson(
  supabase: SupabaseClient,
  payload: {
    id: string;
    user_id: string;
    name: string;
    birthdate: string | null;
    email: string | null;
    relationship: string | null;
    linked_profile_id: string | null;
  }
) {
  const { id, user_id, ...updates } = payload;
  return supabase.from("birthdays").update(updates).eq("id", id).eq("user_id", user_id);
}
