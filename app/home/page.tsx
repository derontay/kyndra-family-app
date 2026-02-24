"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const [status, setStatus] = useState("Connecting to Supabase...");
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [birthdaysStatus, setBirthdaysStatus] = useState("Loading birthdays...");
  const now = new Date();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus("âŒ Supabase error: " + error.message);
      else setStatus("âœ… Supabase connected. Session: " + (data.session ? "Active" : "None"));
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

  const formatDate = (value: string | null) => {
    if (!value) return "Date not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not set";
    return parsed.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Status</div>
        <div className="mt-1 text-[20px] font-extrabold">Kyndra Sunrise ðŸŒ…</div>
        <div className="mt-2 text-[14px] text-[var(--muted)]">{status}</div>
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
    </div>
  );
}
