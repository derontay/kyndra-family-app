import type { SupabaseClient } from "@supabase/supabase-js";

export type EventReminderRecord = {
  id: string;
  event_id: string;
  space_id: string;
  remind_minutes_before: number;
  created_at: string;
};

const REMINDER_SELECT =
  "id,event_id,space_id,remind_minutes_before,created_at";

export function listEventRemindersBySpace(
  supabase: SupabaseClient,
  spaceId: string
) {
  return supabase
    .from("event_reminders")
    .select(REMINDER_SELECT)
    .eq("space_id", spaceId);
}

export function getEventReminderByEventId(
  supabase: SupabaseClient,
  spaceId: string,
  eventId: string
) {
  return supabase
    .from("event_reminders")
    .select(REMINDER_SELECT)
    .eq("space_id", spaceId)
    .eq("event_id", eventId)
    .maybeSingle();
}

export function upsertEventReminder(
  supabase: SupabaseClient,
  payload: {
    event_id: string;
    space_id: string;
    remind_minutes_before: number;
  }
) {
  return supabase
    .from("event_reminders")
    .upsert(payload, { onConflict: "event_id" });
}

export function deleteEventReminderByEventId(
  supabase: SupabaseClient,
  spaceId: string,
  eventId: string
) {
  return supabase
    .from("event_reminders")
    .delete()
    .eq("space_id", spaceId)
    .eq("event_id", eventId);
}
