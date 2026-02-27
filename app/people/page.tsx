"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { findProfileIdByEmail, updatePerson } from "@/lib/people";

type Birthday = {
  id: string;
  name: string;
  birthdate: string | null;
  notes: string | null;
  email: string | null;
  relationship: string | null;
  linked_profile_id: string | null;
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

function isPeopleSchemaMismatch(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the 'email' column") ||
    message.includes("column birthdays.email does not exist") ||
    message.includes('column "email" does not exist') ||
    message.includes("column birthdays.relationship does not exist") ||
    message.includes('column "relationship" does not exist') ||
    message.includes("column birthdays.linked_profile_id does not exist") ||
    message.includes('column "linked_profile_id" does not exist')
  );
}

export default function PeoplePage() {
  const supabase = useMemo(() => createClient(), []);
  const now = new Date();

  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [schemaWarning, setSchemaWarning] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");

  const [editingId, setEditingId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const backfillInFlight = useRef(false);
  const backfillAttempted = useRef<Set<string>>(new Set());

  const formatDate = (value: string | null) => {
    if (!value) return "Date not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date not set";
    return parsed.toLocaleDateString();
  };

  const runLinkBackfill = async (list: Birthday[], uid: string) => {
    if (schemaWarning || backfillInFlight.current) return;
    const candidates = list
      .filter((row) => !row.linked_profile_id && row.email)
      .filter((row) => !backfillAttempted.current.has(`${row.id}|${row.email ?? ""}`))
      .slice(0, 20);
    if (candidates.length === 0) return;

    backfillInFlight.current = true;
    try {
      await Promise.all(
        candidates.map(async (row) => {
          const key = `${row.id}|${row.email ?? ""}`;
          backfillAttempted.current.add(key);
          const emailValue = row.email ?? "";
          if (!emailValue) return;
          const profileId = await findProfileIdByEmail(supabase, emailValue);
          if (!profileId) return;
          await supabase
            .from("birthdays")
            .update({ linked_profile_id: profileId })
            .eq("id", row.id)
            .eq("user_id", uid);
        })
      );
    } finally {
      backfillInFlight.current = false;
    }
  };

  const loadBirthdays = async (uid: string) => {
    setLoading(true);
    setError("");
    setSchemaWarning("");

    const { data, error: loadError } = await supabase
      .from("birthdays")
      .select("id,name,birthdate,notes,email,relationship,linked_profile_id")
      .eq("user_id", uid)
      .order("birthdate", { ascending: true });

    if (loadError) {
      const message = loadError.message ?? "";
      if (isPeopleSchemaMismatch(message)) {
        setSchemaWarning(
          "Database schema not refreshed yet. Run reload_schema_cache.sql and refresh."
        );
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("birthdays")
          .select("id,name,birthdate,notes")
          .eq("user_id", uid)
          .order("birthdate", { ascending: true });
        if (fallbackError) {
          setError(fallbackError.message);
          setBirthdays([]);
          setLoading(false);
          return;
        }
        const list = (fallbackData ?? []) as Birthday[];
        list.sort(
          (a, b) =>
            getNextOccurrenceKey(a.birthdate, now) -
            getNextOccurrenceKey(b.birthdate, now)
        );
        setBirthdays(list);
        setLoading(false);
        return;
      }

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

    runLinkBackfill(list, uid);
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
    setSchemaWarning("");

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

    let linkedProfileId: string | null = null;
    const trimmedEmail = email.trim();
    if (trimmedEmail.includes("@")) {
      linkedProfileId = await findProfileIdByEmail(supabase, trimmedEmail);
    }

    const { error: insertError } = await supabase.from("birthdays").insert({
      user_id: userId,
      name: trimmedName,
      birthdate: birthdate ? birthdate : null,
      notes: notes.trim() ? notes.trim() : null,
      email: trimmedEmail ? trimmedEmail : null,
      relationship: relationship.trim() ? relationship.trim() : null,
      linked_profile_id: linkedProfileId,
    });

    if (insertError) {
      const message = insertError.message ?? "";
      if (isPeopleSchemaMismatch(message)) {
        setSchemaWarning(
          "Database schema not refreshed yet. Run reload_schema_cache.sql and refresh."
        );
        const { error: fallbackInsertError } = await supabase
          .from("birthdays")
          .insert({
            user_id: userId,
            name: trimmedName,
            birthdate: birthdate ? birthdate : null,
            notes: notes.trim() ? notes.trim() : null,
          });
        if (fallbackInsertError) {
          setError(fallbackInsertError.message);
          setSubmitting(false);
          return;
        }
        setName("");
        setBirthdate("");
        setNotes("");
        setEmail("");
        setRelationship("");
        await loadBirthdays(userId);
        setSubmitting(false);
        return;
      }

      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setName("");
    setBirthdate("");
    setNotes("");
    setEmail("");
    setRelationship("");
    await loadBirthdays(userId);
    setSubmitting(false);
  };

  const onEdit = (birthday: Birthday) => {
    setEditingId(birthday.id);
    setEditName(birthday.name ?? "");
    setEditBirthdate(birthday.birthdate ?? "");
    setEditEmail(birthday.email ?? "");
    setEditRelationship(birthday.relationship ?? "");
  };

  const onCancelEdit = () => {
    setEditingId("");
    setEditName("");
    setEditBirthdate("");
    setEditEmail("");
    setEditRelationship("");
  };

  const onSaveEdit = async (birthday: Birthday) => {
    if (!userId) {
      setError("You need to sign in to update birthdays.");
      return;
    }

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    let linkedProfileId: string | null = birthday.linked_profile_id ?? null;
    const trimmedEmail = editEmail.trim();
    if (trimmedEmail.includes("@") && !linkedProfileId) {
      linkedProfileId = await findProfileIdByEmail(supabase, trimmedEmail);
    }

    const { error: updateError } = await updatePerson(supabase, {
      id: birthday.id,
      user_id: userId,
      name: trimmedName,
      birthdate: editBirthdate ? editBirthdate : null,
      email: trimmedEmail ? trimmedEmail : null,
      relationship: editRelationship.trim() ? editRelationship.trim() : null,
      linked_profile_id: linkedProfileId,
    });

    if (updateError) {
      const message = updateError.message ?? "";
      if (isPeopleSchemaMismatch(message)) {
        setSchemaWarning(
          "Database schema not refreshed yet. Run reload_schema_cache.sql and refresh."
        );
        const { error: fallbackUpdateError } = await supabase
          .from("birthdays")
          .update({
            name: trimmedName,
            birthdate: editBirthdate ? editBirthdate : null,
          })
          .eq("id", birthday.id)
          .eq("user_id", userId);
        if (fallbackUpdateError) {
          setError(fallbackUpdateError.message);
          return;
        }
        await loadBirthdays(userId);
        onCancelEdit();
        return;
      }

      setError(updateError.message);
      return;
    }

    await loadBirthdays(userId);
    onCancelEdit();
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
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-[18px] font-extrabold">Birthdays</div>
          <button
            type="button"
            className="ky-btn text-[12px] px-3 py-1"
            onClick={async () => {
              if (!userId) {
                setError("You need to sign in to manage birthdays.");
                return;
              }
              setError("");
              await runLinkBackfill(birthdays, userId);
              await loadBirthdays(userId);
            }}
          >
            Refresh linking
          </button>
        </div>

        {loading ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">Loading...</div>
        ) : error ? (
          <div className="mt-3 text-[14px] text-red-600">{error}</div>
        ) : null}

        {schemaWarning ? (
          <div className="mt-3 text-[14px] text-[var(--muted)]">
            {schemaWarning}
          </div>
        ) : null}


        {!loading && !error ? (
          birthdays.length === 0 ? (
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
                    {editingId === birthday.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          placeholder="Name"
                        />
                        <input
                          className="w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                          type="date"
                          value={editBirthdate}
                          onChange={(event) => setEditBirthdate(event.target.value)}
                        />
                        <input
                          className="w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                          type="email"
                          value={editEmail}
                          onChange={(event) => setEditEmail(event.target.value)}
                          placeholder="Email (optional)"
                        />
                        <input
                          className="w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
                          value={editRelationship}
                          onChange={(event) => setEditRelationship(event.target.value)}
                          placeholder="Relationship (optional)"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-[14px] font-semibold">{birthday.name}</div>
                        <div className="text-[12px] text-[var(--muted)]">
                          {formatDate(birthday.birthdate)}
                        </div>
                        <div className="text-[12px] text-[var(--muted)]">
                          {getCountdownLabel(birthday.birthdate, now)}
                        </div>
                        {birthday.relationship ? (
                          <div className="text-[12px] text-[var(--muted)]">
                            {birthday.relationship}
                          </div>
                        ) : null}
                        {birthday.email ? (
                          <div className="text-[12px] text-[var(--muted)]">
                            {birthday.email}
                          </div>
                        ) : null}
                        {birthday.linked_profile_id ? (
                          <div className="text-[12px] text-[var(--muted)]">
                            On app ✅
                          </div>
                        ) : (
                          <div className="text-[12px] text-[var(--muted)]">
                            Not on app
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {birthday.linked_profile_id ? (
                      <div className="text-[12px] text-[var(--muted)]">
                        This person is linked to an app user. Edit their profile instead.
                      </div>
                    ) : editingId === birthday.id ? (
                      <>
                        <button
                          type="button"
                          className="ky-btn text-[12px] px-3 py-1"
                          onClick={() => onSaveEdit(birthday)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="ky-btn text-[12px] px-3 py-1"
                          onClick={onCancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ky-btn text-[12px] px-3 py-1"
                          onClick={() => onEdit(birthday)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ky-btn text-[12px] px-3 py-1"
                          onClick={() => onDelete(birthday)}
                          disabled={deletingId === birthday.id}
                        >
                          {deletingId === birthday.id ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          type="button"
                          className="ky-btn text-[12px] px-3 py-1"
                          disabled
                          title="Invite flow not configured yet"
                        >
                          Invite
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
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
          <div>
            <label className="text-[12px] text-[var(--muted)]">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              type="email"
              placeholder="Optional email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="text-[12px] text-[var(--muted)]">Relationship</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-[14px] outline-none"
              placeholder="Optional relationship"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
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
