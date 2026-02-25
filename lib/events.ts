import type { SupabaseClient } from "@supabase/supabase-js";

export type EventRecord = {
  id: string;
  space_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const EVENT_SELECT = "id,space_id,title,description,starts_at,ends_at,created_at";

export function listEventsBySpace(supabase: SupabaseClient, spaceId: string) {
  const nowIso = new Date().toISOString();
  return supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("space_id", spaceId)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });
}

export function getEventById(
  supabase: SupabaseClient,
  spaceId: string,
  eventId: string
) {
  return supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("space_id", spaceId)
    .eq("id", eventId)
    .single();
}

export function createEvent(
  supabase: SupabaseClient,
  payload: {
    space_id: string;
    title: string;
    description: string | null;
    starts_at: string | null;
    ends_at: string | null;
  }
) {
  return supabase.from("events").insert(payload);
}

export function updateEvent(
  supabase: SupabaseClient,
  spaceId: string,
  eventId: string,
  payload: {
    title: string;
    description: string | null;
    starts_at: string | null;
    ends_at: string | null;
  }
) {
  return supabase
    .from("events")
    .update(payload)
    .eq("space_id", spaceId)
    .eq("id", eventId);
}

export function deleteEvent(
  supabase: SupabaseClient,
  spaceId: string,
  eventId: string
) {
  return supabase
    .from("events")
    .delete()
    .eq("space_id", spaceId)
    .eq("id", eventId);
}
