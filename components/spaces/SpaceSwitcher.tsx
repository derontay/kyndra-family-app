"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSpace } from "@/components/spaces/SpaceContext";

type Space = {
  id: string;
  name: string;
  created_at: string;
  owner_id: string | null;
};

export default function SpaceSwitcher() {
  const { activeSpaceId, setActiveSpace } = useSpace();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentId, setCurrentId] = useState<string>(activeSpaceId);

  async function loadSpaces(selectId?: string) {
    const { data, error } = await supabase
      .from("spaces")
      .select("id,name,created_at,owner_id")
      .order("created_at");

    if (error) {
      console.error("Supabase spaces error:", error.message);
      return;
    }

    const list = (data ?? []) as Space[];
    setSpaces(list);

    let nextId = selectId ?? activeSpaceId;

    if (!nextId || !list.some((s) => s.id === nextId)) {
      nextId = list[0]?.id ?? "";
    }

    if (nextId) {
      setCurrentId(nextId);
      const space = list.find((s) => s.id === nextId);
      if (space) {
        setActiveSpace(space.id, space.name);
      }
    }
  }

  useEffect(() => {
    loadSpaces();
  }, []);

  useEffect(() => {
    if (activeSpaceId && activeSpaceId !== currentId) {
      setCurrentId(activeSpaceId);
    }
  }, [activeSpaceId, currentId]);

  function onChange(id: string) {
    setCurrentId(id);
    const space = spaces.find((s) => s.id === id);
    if (space) {
      setActiveSpace(space.id, space.name);
    }
  }

  async function addSpace() {
    const name = window.prompt("New Space name?")?.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("spaces")
      .insert({ name })
      .select("id,name,created_at,owner_id")
      .single();

    if (error) {
      alert("Could not create space: " + error.message);
      return;
    }

    await loadSpaces(data.id);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-[var(--muted)]">Current Space</span>

      <select
        value={currentId}
        onChange={(e) => onChange(e.target.value)}
        className="ky-chip cursor-pointer"
        disabled={spaces.length === 0}
      >
        {spaces.length === 0 ? (
          <option value="">Loading...</option>
        ) : (
          spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))
        )}
      </select>

      <button className="ky-btn" onClick={addSpace} title="Create a new Space">
        + New
      </button>
    </div>
  );
}
