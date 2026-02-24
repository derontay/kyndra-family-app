"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

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

function getMonthMeta() {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const monthStart = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = monthStart.getDay();

  return {
    year,
    monthIndex,
    daysInMonth,
    startWeekday,
    label: now.toLocaleString("default", { month: "long", year: "numeric" }),
  };
}

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const { daysInMonth, startWeekday, label } = getMonthMeta();
  const totalCells = 42;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return dayNumber;
  });

  const formatDate = (value: string | null) => {
    if (!value) return "Date not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not set";
    return parsed.toLocaleDateString();
  };

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("You need to sign in to view birthdays.");
        setLoading(false);
        return;
      }

      const { data: birthdayData, error: loadError } = await supabase
        .from("birthdays")
        .select("id,name,birthdate")
        .eq("user_id", data.user.id)
        .order("birthdate", { ascending: true })
        .limit(50);

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      const list = (birthdayData ?? []) as Birthday[];
      const now = new Date();
      list.sort(
        (a, b) => getNextOccurrenceKey(a.birthdate, now) - getNextOccurrenceKey(b.birthdate, now)
      );
      setBirthdays(list.slice(0, 10));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      <div className="ky-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-[var(--muted)]">Month</div>
            <div className="text-[18px] font-extrabold">{label}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="ky-btn">Prev</button>
            <button className="ky-btn ky-btn-primary">Today</button>
            <button className="ky-btn">Next</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-[12px] text-[var(--muted)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((day, index) => (
            <div
              key={`${day ?? "empty"}-${index}`}
              className={`h-12 rounded-xl border border-[var(--border)] p-2 text-[12px] ${
                day ? "bg-white/80 text-[var(--text)]" : "bg-white/40"
              }`}
            >
              {day ? <div className="font-semibold">{day}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Upcoming</div>
        <div className="mt-1 text-[18px] font-extrabold">Birthdays</div>

        {loading ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">Loading...</div>
        ) : error ? (
          <div className="mt-3 text-[14px] text-red-600">{error}</div>
        ) : birthdays.length === 0 ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">
            No birthdays yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {birthdays.map((birthday) => (
              <div
                key={birthday.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
              >
                <div className="text-[14px] font-semibold">{birthday.name}</div>
                <div className="text-[12px] text-[var(--muted)]">
                  {formatDate(birthday.birthdate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Upcoming</div>
        <div className="mt-1 text-[18px] font-extrabold">Events</div>

        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-[var(--border)] px-3 py-2">
            <div className="text-[13px] font-semibold">No events yet</div>
            <div className="text-[12px] text-[var(--muted)]">
              Add events to see them here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
