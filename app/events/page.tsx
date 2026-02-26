"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import {
  deleteEvent,
  listEventsBySpace,
  listPastEventsBySpace,
  type EventRecord,
} from "@/lib/events";
import {
  listEventRemindersBySpace,
  getReminderLabel,
  type EventReminderRecord,
} from "@/lib/eventReminders";
import { useSpace } from "@/components/spaces/SpaceContext";

export default function EventsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { activeSpaceId, activeSpaceName } = useSpace();

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [reminderMinutesByEventId, setReminderMinutesByEventId] = useState<
    Record<string, number>
  >({});
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [view, setView] = useState<"upcoming" | "past">("upcoming");

  const formatDateTime = (value: string | null) => {
    if (!value) return "Date not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not set";
    return parsed.toLocaleString();
  };

  const formatRange = (startsAt: string | null, endsAt: string | null) => {
    if (!startsAt && !endsAt) return "Date not set";
    if (startsAt && !endsAt) return formatDateTime(startsAt);
    if (!startsAt && endsAt) return formatDateTime(endsAt);
    return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
  };

  const loadEvents = async (spaceId: string) => {
    setLoading(true);
    setError("");

    if (!spaceId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!userData.user) {
      setError("You need to sign in to view events.");
      setLoading(false);
      return;
    }

    const { data, error: loadError } =
      view === "upcoming"
        ? await listEventsBySpace(supabase, spaceId)
        : await listPastEventsBySpace(supabase, spaceId);
    if (loadError) {
      setError(loadError.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    if (view === "upcoming") {
      const { data: reminderData, error: reminderError } =
        await listEventRemindersBySpace(supabase, spaceId);
      if (!reminderError) {
        const map: Record<string, number> = {};
        (reminderData ?? []).forEach((reminder) => {
          const row = reminder as EventReminderRecord;
          if (row?.event_id) {
            map[row.event_id] = row.remind_minutes_before;
          }
        });
        setReminderMinutesByEventId(map);
      }
    } else {
      setReminderMinutesByEventId({});
    }

    setEvents((data ?? []) as EventRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents(activeSpaceId);
  }, [activeSpaceId, supabase, view]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 30_000);
    return () => clearInterval(intervalId);
  }, []);

  const onDelete = async (eventId: string) => {
    if (!activeSpaceId) {
      setError("Select a space to delete events.");
      return;
    }

    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;

    setError("");
    setDeletingId(eventId);

    const { error: deleteError } = await deleteEvent(
      supabase,
      activeSpaceId,
      eventId
    );

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId("");
      return;
    }

    await loadEvents(activeSpaceId);
    setDeletingId("");
  };

  return (
    <div className="space-y-4">
      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Events</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-[18px] font-extrabold">
          {activeSpaceName || "Your Space"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`ky-btn text-[12px] px-3 py-1 ${
                view === "upcoming"
                  ? "ky-btn-primary"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => setView("upcoming")}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`ky-btn text-[12px] px-3 py-1 ${
                view === "past" ? "ky-btn-primary" : "text-[var(--muted)]"
              }`}
              onClick={() => setView("past")}
            >
              Past
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[12px] text-[var(--muted)]">
            {activeSpaceId
              ? view === "upcoming"
                ? "Upcoming events"
                : "Past events"
              : "Select a space to continue"}
          </div>
          <Link className="ky-btn text-[12px] px-3 py-1" href="/events/new">
            Add Event
          </Link>
        </div>

        {loading ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">Loading...</div>
        ) : error ? (
          <div className="mt-3 text-[14px] text-red-600">{error}</div>
        ) : events.length === 0 ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">
            No events yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {events.map((event) => {
              const reminderLabel =
                view === "upcoming"
                  ? getReminderLabel(
                      event.starts_at,
                      reminderMinutesByEventId[event.id],
                      nowIso
                    )
                  : null;
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                >
                  <div>
                    <div className="text-[14px] font-semibold">{event.title}</div>
                    <div className="text-[12px] text-[var(--muted)]">
                      {formatRange(event.starts_at, event.ends_at)}
                    </div>
                    {event.description ? (
                      <div className="text-[12px] text-[var(--muted)]">
                        {event.description}
                      </div>
                    ) : null}
                    {reminderLabel ? (
                      <div className="text-[12px] text-[var(--muted)]">
                        {reminderLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/events/${event.id}/edit`}
                      className="ky-btn text-[12px] px-3 py-1"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="ky-btn text-[12px] px-3 py-1"
                      onClick={() => onDelete(event.id)}
                      disabled={deletingId === event.id}
                    >
                      {deletingId === event.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
