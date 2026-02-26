"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { deleteEvent, getEventById, updateEvent, type EventRecord } from "@/lib/events";
import {
  deleteEventReminderByEventId,
  upsertEventReminder,
  getEventReminderByEventId,
  type EventReminderRecord,
} from "@/lib/eventReminders";
import { useSpace } from "@/components/spaces/SpaceContext";

export default function EditEventPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();
  const { activeSpaceId } = useSpace();

  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const toLocalInputValue = (value: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      if (!eventId || typeof eventId !== "string") {
        setError("Event not found.");
        setLoading(false);
        return;
      }

      if (!activeSpaceId) {
        setError("Select a space before editing events.");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!userData.user) {
        setError("You need to sign in to edit events.");
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await getEventById(
        supabase,
        activeSpaceId,
        eventId
      );

      if (!active) return;

      if (loadError || !data) {
        setError(loadError?.message ?? "Event not found.");
        setLoading(false);
        return;
      }

      setEvent(data as EventRecord);
      setTitle(data.title ?? "");
      setStartsAt(toLocalInputValue(data.starts_at));
      setEndsAt(toLocalInputValue(data.ends_at));
      setDescription(data.description ?? "");

      const { data: reminderData } = await getEventReminderByEventId(
        supabase,
        activeSpaceId,
        eventId
      );
      const reminder = reminderData as EventReminderRecord | null;
      if (reminder?.remind_minutes_before) {
        setReminderMinutes(reminder.remind_minutes_before);
      }
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [activeSpaceId, eventId, supabase]);

  const toIsoOrNull = (value: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (!startsAt) {
      setError("Start date/time is required.");
      return;
    }

    if (!activeSpaceId || !eventId || typeof eventId !== "string") {
      setError("Select a space before editing events.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await updateEvent(
      supabase,
      activeSpaceId,
      eventId,
      {
        title: trimmedTitle,
        description: description.trim() ? description.trim() : null,
        starts_at: toIsoOrNull(startsAt),
        ends_at: toIsoOrNull(endsAt),
      }
    );

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const reminderResult =
      reminderMinutes === 0
        ? await deleteEventReminderByEventId(
            supabase,
            activeSpaceId,
            eventId
          )
        : await upsertEventReminder(supabase, {
            event_id: eventId,
            space_id: activeSpaceId,
            remind_minutes_before: reminderMinutes,
          });

    if (reminderResult.error) {
      setError(reminderResult.error.message);
      setSaving(false);
      return;
    }

    router.push("/events");
  };

  const onDelete = async () => {
    if (!activeSpaceId || !eventId || typeof eventId !== "string") {
      setError("Select a space before deleting events.");
      return;
    }

    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;

    setError("");
    setDeleting(true);

    const { error: deleteError } = await deleteEvent(
      supabase,
      activeSpaceId,
      eventId
    );

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/events");
  };

  return (
    <div className="space-y-4">
      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Events</div>
        <div className="mt-1 text-[18px] font-extrabold">Edit Event</div>

        {loading ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">
            Loading...
          </div>
        ) : error ? (
          <div className="mt-3 text-[14px] text-red-600">{error}</div>
        ) : event ? (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-[12px] text-[var(--muted)]">Title</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-[12px] text-[var(--muted)]">
                Start date/time
              </label>
              <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </div>

            <div>
              <label className="text-[12px] text-[var(--muted)]">
                End date/time
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>

            <div>
              <label className="text-[12px] text-[var(--muted)]">
                Description
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div>
              <label className="text-[12px] text-[var(--muted)]">
                Remind me
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                value={reminderMinutes}
                onChange={(event) => setReminderMinutes(Number(event.target.value))}
              >
                <option value={0}>None</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>60 minutes before</option>
                <option value={120}>120 minutes before</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="ky-btn ky-btn-primary flex-1"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                className="ky-btn flex-1"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <Link href="/events" className="ky-btn flex-1 text-center">
                Cancel
              </Link>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
