"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { listEventsBySpace, type EventRecord } from "@/lib/events";
import {
  listEventRemindersBySpace,
  getReminderLabel,
  type EventReminderRecord,
} from "@/lib/eventReminders";
import { useSpace } from "@/components/spaces/SpaceContext";

type Birthday = {
  id: string;
  name: string;
  birthdate: string | null;
};

function getNextOccurrenceKey(value: string | null, now: Date) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return Number.MAX_SAFE_INTEGER;
  const month = parsed.getMonth();
  const day = parsed.getDate();
  const year = now.getFullYear();
  const thisYear = new Date(year, month, day);
  const next = thisYear >= now ? thisYear : new Date(year + 1, month, day);
  return next.getTime();
}

function getCountdownLabel(value: string | null, now: Date) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const month = parsed.getMonth();
  const day = parsed.getDate();
  const year = now.getFullYear();
  const startOfToday = new Date(year, now.getMonth(), now.getDate());
  const next = new Date(year, month, day);
  if (next < startOfToday) next.setFullYear(year + 1);
  const diffMs = next.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

export default function HomePage() {
  const { activeSpaceId } = useSpace();
  const [status, setStatus] = useState("Connecting to Supabase...");
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [birthdaysStatus, setBirthdaysStatus] = useState("Loading birthdays...");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsStatus, setEventsStatus] = useState("Loading events...");
  const [reminderMinutesByEventId, setReminderMinutesByEventId] = useState<
    Record<string, number>
  >({});
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const now = new Date();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus("Supabase error: " + error.message);
      else
        setStatus(
          "Supabase connected. Session: " + (data.session ? "Active" : "None")
        );
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("birthdays")
        .select("id,name,birthdate")
        .order("birthdate", { ascending: true })
        .limit(6);

      if (error) {
        setBirthdaysStatus("Birthdays error: " + error.message);
        return;
      }

      const list = (data ?? []) as Birthday[];
      list.sort(
        (a, b) => getNextOccurrenceKey(a.birthdate, now) - getNextOccurrenceKey(b.birthdate, now)
      );
      setBirthdays(list);
      setBirthdaysStatus("");
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!activeSpaceId) {
        setEvents([]);
        setEventsStatus("Select a space to view events.");
        return;
      }

      const { data, error } = await listEventsBySpace(supabase, activeSpaceId);
      if (error) {
        setEventsStatus("Events error: " + error.message);
        setEvents([]);
        return;
      }

      const { data: reminderData, error: reminderError } =
        await listEventRemindersBySpace(supabase, activeSpaceId);
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

      const list = (data ?? []) as EventRecord[];
      setEvents(list.slice(0, 3));
      setEventsStatus("");
    })();
  }, [activeSpaceId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 30_000);
    return () => clearInterval(intervalId);
  }, []);

  const formatDate = (value: string | null) => {
    if (!value) return "Date not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not set";
    return parsed.toLocaleDateString();
  };

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

  const todayEvents = (() => {
    const nowLocal = new Date();
    const todayStart = new Date(
      nowLocal.getFullYear(),
      nowLocal.getMonth(),
      nowLocal.getDate()
    );
    const todayEnd = new Date(
      nowLocal.getFullYear(),
      nowLocal.getMonth(),
      nowLocal.getDate() + 1
    );

    return events
      .filter((event) => {
        const start = event.starts_at ? new Date(event.starts_at) : null;
        if (!start || Number.isNaN(start.getTime())) return false;
        const end = event.ends_at ? new Date(event.ends_at) : null;
        const startsToday = start >= todayStart && start < todayEnd;
        const ongoingToday =
          start < todayStart && end && !Number.isNaN(end.getTime()) && end >= todayStart;
        return startsToday || ongoingToday;
      })
      .slice(0, 3);
  })();

  return (
    <div className="space-y-4">
      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Status</div>
        <div className="mt-1 text-[20px] font-extrabold">Kyndra Sunrise</div>
        <div className="mt-2 text-[14px] text-[var(--muted)]">{status}</div>
        <div className="mt-4">
          <Link className="ky-btn inline-flex" href="/feedback">
            Feedback
          </Link>
        </div>
      </div>

      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Upcoming</div>
        <div className="mt-1 text-[18px] font-extrabold">Birthdays</div>

        {birthdaysStatus ? (
          <div className="mt-2 text-[14px] text-[var(--muted)]">{birthdaysStatus}</div>
        ) : birthdays.length === 0 ? (
          <div className="mt-2 text-[14px] text-[var(--muted)]">
            No birthdays yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {birthdays.map((birthday) => (
              <div
                key={birthday.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
              >
                <div className="text-[14px] font-semibold">{birthday.name}</div>
                <div className="flex flex-col items-end">
                  <div className="text-[12px] text-[var(--muted)]">
                    {formatDate(birthday.birthdate)}
                  </div>
                  <div className="text-[12px] text-[var(--muted)]">
                    {getCountdownLabel(birthday.birthdate, now)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Today</div>
        <div className="mt-1 text-[18px] font-extrabold">Events</div>

        {todayEvents.length === 0 ? (
          <div className="mt-2 text-[14px] text-[var(--muted)]">
            No events today.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {todayEvents.map((event) => {
              const reminderLabel = getReminderLabel(
                event.starts_at,
                reminderMinutesByEventId[event.id],
                nowIso
              );
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
                    {reminderLabel ? (
                      <div className="text-[12px] text-[var(--muted)]">
                        {reminderLabel}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Upcoming</div>
        <div className="mt-1 text-[18px] font-extrabold">Events</div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-[12px] text-[var(--muted)]">Next up</div>
          <div className="flex items-center gap-2">
            <Link className="ky-btn text-[12px] px-3 py-1" href="/events/new">
              Add Event
            </Link>
            <Link className="ky-btn text-[12px] px-3 py-1" href="/events">
              View All
            </Link>
          </div>
        </div>

        {eventsStatus ? (
          <div className="mt-2 text-[14px] text-[var(--muted)]">{eventsStatus}</div>
        ) : events.length === 0 ? (
          <div className="mt-2 text-[14px] text-[var(--muted)]">
            No upcoming events.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {events.map((event) => {
              const reminderLabel = getReminderLabel(
                event.starts_at,
                reminderMinutesByEventId[event.id],
                nowIso
              );
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
                    {reminderLabel ? (
                      <div className="text-[12px] text-[var(--muted)]">
                        {reminderLabel}
                      </div>
                    ) : null}
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
