"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Birthday = {
  id: string;
  name: string;
  birthdate: string | null;
  notes: string | null;
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

export default function PeoplePage() {
  const supabase = useMemo(() => createClient(), []);
  const now = new Date();

  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [notes, setNotes] = useState("");

  const formatDate = (value: string | null) => {
    if (!value) return "Date not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not set";
    return parsed.toLocaleDateString();
  };

  const loadBirthdays = async (uid: string) => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("birthdays")
      .select("id,name,birthdate,notes")
      .eq("user_id", uid)
      .order("birthdate", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setBirthdays([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as Birthday[];
    list.sort(
      (a, b) => getNextOccurrenceKey(a.birthdate, now) - getNextOccurrenceKey(b.birthdate, now)
    );
    setBirthdays(list);
    setLoading(false);
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
        setError("You need to sign in to manage birthdays.");
        setLoading(false);
        return;
      }

      setUserId(data.user.id);
      loadBirthdays(data.user.id);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (!userId) {
      setError("You need to sign in to add birthdays.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("birthdays").insert({
      user_id: userId,
      name: trimmedName,
      birthdate: birthdate ? birthdate : null,
      notes: notes.trim() ? notes.trim() : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setName("");
    setBirthdate("");
    setNotes("");
    await loadBirthdays(userId);
    setSubmitting(false);
  };

  const onDelete = async (birthday: Birthday) => {
    if (!userId) {
      setError("You need to sign in to delete birthdays.");
      return;
    }

    const confirmed = window.confirm(`Delete ${birthday.name}?`);
    if (!confirmed) return;

    setError("");
    setDeletingId(birthday.id);

    const { error: deleteError } = await supabase
      .from("birthdays")
      .delete()
      .eq("id", birthday.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId("");
      return;
    }

    await loadBirthdays(userId);
    setDeletingId("");
  };

  return (
    <div className="space-y-4">
      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">People</div>
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
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
              >
                <div>
                  <div className="text-[14px] font-semibold">{birthday.name}</div>
                  <div className="text-[12px] text-[var(--muted)]">
                    {formatDate(birthday.birthdate)}
                  </div>
                  <div className="text-[12px] text-[var(--muted)]">
                    {getCountdownLabel(birthday.birthdate, now)}
                  </div>
                </div>
                <button
                  type="button"
                  className="ky-btn text-[12px] px-3 py-1"
                  onClick={() => onDelete(birthday)}
                  disabled={deletingId === birthday.id}
                >
                  {deletingId === birthday.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Add</div>
        <div className="mt-1 text-[18px] font-extrabold">New Birthday</div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[12px] text-[var(--muted)]">Name</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              placeholder="e.g., Maya"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[12px] text-[var(--muted)]">Birthdate</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              type="date"
              value={birthdate}
              onChange={(event) => setBirthdate(event.target.value)}
            />
          </div>

          <div>
            <label className="text-[12px] text-[var(--muted)]">Notes</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              rows={3}
              placeholder="Optional notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="ky-btn ky-btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Add birthday"}
          </button>
        </form>
      </div>
    </div>
  );
}
