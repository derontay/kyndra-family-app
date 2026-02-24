"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SpaceState = {
  activeSpaceId: string;
  activeSpaceName: string;
  setActiveSpace: (id: string, name: string) => void;
};

const SpaceContext = createContext<SpaceState | null>(null);

const LS_KEY_ID = "kyndra_current_space_id";
const LS_KEY_NAME = "kyndra_current_space_name";

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [activeSpaceId, setActiveSpaceId] = useState("");
  const [activeSpaceName, setActiveSpaceName] = useState("Loading...");

  useEffect(() => {
    const savedId = localStorage.getItem(LS_KEY_ID) ?? "";
    const savedName = localStorage.getItem(LS_KEY_NAME) ?? "";
    if (savedId) setActiveSpaceId(savedId);
    if (savedName) setActiveSpaceName(savedName);
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === LS_KEY_ID && typeof event.newValue === "string") {
        setActiveSpaceId(event.newValue);
      }
      if (event.key === LS_KEY_NAME && typeof event.newValue === "string") {
        setActiveSpaceName(event.newValue || "Loading...");
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setActiveSpace = (id: string, name: string) => {
    setActiveSpaceId(id);
    setActiveSpaceName(name || "Loading...");
    localStorage.setItem(LS_KEY_ID, id);
    localStorage.setItem(LS_KEY_NAME, name);
  };

  const value = useMemo(
    () => ({ activeSpaceId, activeSpaceName, setActiveSpace }),
    [activeSpaceId, activeSpaceName]
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  const ctx = useContext(SpaceContext);
  if (!ctx) {
    throw new Error("useSpace must be used within SpaceProvider");
  }
  return ctx;
}
