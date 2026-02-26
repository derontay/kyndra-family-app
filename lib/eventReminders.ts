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

export function getReminderLabel(
  startsAtIso: string | null,
  reminderMinutes: number | undefined,
  nowIso?: string
) {
  if (!startsAtIso || !reminderMinutes) return null;

  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) return null;

  const now = nowIso ? new Date(nowIso) : new Date();
  if (Number.isNaN(now.getTime())) return null;

  if (now >= startsAt) return null;

  const reminderAt = new Date(startsAt.getTime() - reminderMinutes * 60_000);

  if (now >= reminderAt) return "⏰ due";

  const diffMs = reminderAt.getTime() - now.getTime();
  const totalMinutes = Math.ceil(diffMs / 60_000);

  if (totalMinutes >= 1440) {
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    return hours > 0 ? `⏰ in ${days}d ${hours}h` : `⏰ in ${days}d`;
  }

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `⏰ in ${hours}h ${minutes}m` : `⏰ in ${hours}h`;
  }

  return `⏰ in ${totalMinutes}m`;
}
