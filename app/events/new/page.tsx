"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { createEvent } from "@/lib/events";
import { useSpace } from "@/components/spaces/SpaceContext";

export default function NewEventPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { activeSpaceId } = useSpace();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    if (!activeSpaceId) {
      setError("Select a space before creating events.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setError(userError.message);
      return;
    }

    if (!userData.user) {
      setError("You need to sign in to create events.");
      return;
    }

    setSaving(true);

    const toIsoOrNull = (value: string) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.toISOString();
    };

    const { error: insertError } = await createEvent(supabase, {
      space_id: activeSpaceId,
      title: trimmedTitle,
      description: description.trim() ? description.trim() : null,
      starts_at: toIsoOrNull(startsAt),
      ends_at: toIsoOrNull(endsAt),
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push("/events");
  };

  return (
    <div className="space-y-4">
      <div className="ky-card p-5">
        <div className="text-[12px] text-[var(--muted)]">Events</div>
        <div className="mt-1 text-[18px] font-extrabold">New Event</div>

        {error ? (
          <div className="mt-3 text-[14px] text-red-600">{error}</div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[12px] text-[var(--muted)]">Title</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              placeholder="e.g., Family brunch"
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
            <label className="text-[12px] text-[var(--muted)]">Description</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              rows={3}
              placeholder="Optional description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="ky-btn ky-btn-primary flex-1"
              disabled={saving}
            >
              {saving ? "Saving..." : "Create event"}
            </button>
            <Link href="/events" className="ky-btn flex-1 text-center">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
