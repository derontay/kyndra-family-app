"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [view, setView] = useState<"upcoming" | "past" | "today" | "all">(
    "upcoming"
  );
  const [query, setQuery] = useState("");

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

  const loadEvents = useCallback(
    async (spaceId: string) => {
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
        view === "past"
          ? await listPastEventsBySpace(supabase, spaceId)
          : await listEventsBySpace(supabase, spaceId);
      if (loadError) {
        setError(loadError.message);
        setEvents([]);
        setLoading(false);
        return;
      }

      if (view !== "past") {
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
    },
    [supabase, view]
  );

  useEffect(() => {
    loadEvents(activeSpaceId);
  }, [activeSpaceId, loadEvents]);

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

  const nowLocal = useMemo(() => new Date(nowIso), [nowIso]);
  const normalizedQuery = query.trim().toLowerCase();
  const todayStart = useMemo(() => {
    const start = new Date(nowLocal);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [nowLocal]);
  const todayEnd = useMemo(() => {
    const end = new Date(todayStart);
    end.setDate(end.getDate() + 1);
    return end;
  }, [todayStart]);

  const isTodayOverlapping = (event: EventRecord) => {
    const start = event.starts_at ? new Date(event.starts_at) : null;
    if (!start || Number.isNaN(start.getTime())) return false;
    const end = event.ends_at ? new Date(event.ends_at) : null;
    const endValid = end && !Number.isNaN(end.getTime());
    return (
      start < todayEnd &&
      ((endValid && end >= todayStart) || (!endValid && start >= todayStart))
    );
  };

  const isExpiredNow = (event: EventRecord) => {
    const start = event.starts_at ? new Date(event.starts_at) : null;
    if (!start || Number.isNaN(start.getTime())) return false;
    const end = event.ends_at ? new Date(event.ends_at) : null;
    const endValid = end && !Number.isNaN(end.getTime());
    return endValid ? end < nowLocal : start < nowLocal;
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (normalizedQuery) {
        const haystack = `${event.title ?? ""} ${event.description ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

    if (view === "today") {
      const start = event.starts_at ? new Date(event.starts_at) : null;
      if (!start || Number.isNaN(start.getTime())) return false;
      const end = event.ends_at ? new Date(event.ends_at) : null;
      const endValid = end && !Number.isNaN(end.getTime());
      return (
        start < todayEnd &&
        ((endValid && end >= todayStart) || (!endValid && start >= todayStart))
      );
    }

      return true;
    });
  }, [events, normalizedQuery, view, todayEnd, todayStart]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aTime = a.starts_at ? new Date(a.starts_at).getTime() : Number.NaN;
      const bTime = b.starts_at ? new Date(b.starts_at).getTime() : Number.NaN;
      const aKey = Number.isFinite(aTime)
        ? aTime
        : view === "past"
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY;
      const bKey = Number.isFinite(bTime)
        ? bTime
        : view === "past"
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY;
      return view === "past" ? bKey - aKey : aKey - bKey;
    });
  }, [filteredEvents, view]);

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
                view === "today" ? "ky-btn-primary" : "text-[var(--muted)]"
              }`}
              onClick={() => setView("today")}
            >
              Today
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
            <button
              type="button"
              className={`ky-btn text-[12px] px-3 py-1 ${
                view === "all" ? "ky-btn-primary" : "text-[var(--muted)]"
              }`}
              onClick={() => setView("all")}
            >
              All
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[12px] text-[var(--muted)]">
            {activeSpaceId
              ? view === "upcoming"
                ? "Upcoming events"
                : view === "today"
                  ? "Today"
                  : view === "all"
                    ? "All events"
                : "Past events"
              : "Select a space to continue"}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="w-40 rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[12px] outline-none"
              placeholder="Search events…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Link className="ky-btn text-[12px] px-3 py-1" href="/events/new">
              Add Event
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">Loading...</div>
        ) : error ? (
          <div className="mt-3 text-[14px] text-red-600">{error}</div>
        ) : sortedEvents.length === 0 ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">
            No events yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {sortedEvents.map((event) => {
              const expired = view === "today" ? isExpiredNow(event) : false;
              const isPastNow = (() => {
                const start = event.starts_at ? new Date(event.starts_at) : null;
                if (!start || Number.isNaN(start.getTime())) return false;
                const end = event.ends_at ? new Date(event.ends_at) : null;
                const endValid = end && !Number.isNaN(end.getTime());
                return endValid ? end < nowLocal : start < nowLocal;
              })();
              const isMuted =
                view === "past"
                  ? true
                  : view === "all" || view === "today"
                    ? isPastNow
                    : false;
              const reminderLabel =
                view === "upcoming"
                  ? getReminderLabel(
                      event.starts_at,
                      reminderMinutesByEventId[event.id],
                      nowIso
                    )
                  : view === "today" && !expired
                    ? getReminderLabel(
                        event.starts_at,
                        reminderMinutesByEventId[event.id],
                        nowIso
                      )
                    : null;
              return (
                <div
                  key={event.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2 ${
                    isMuted ? "opacity-60" : ""
                  }`}
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
                    {expired ? (
                      <div className="text-[12px] text-[var(--muted)]">Ended</div>
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
