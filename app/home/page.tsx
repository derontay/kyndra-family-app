"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [status, setStatus] = useState("Connecting to Supabase...");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus("❌ Supabase error: " + error.message);
      else setStatus("✅ Supabase connected. Session: " + (data.session ? "Active" : "None"));
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="ky-card p-6">
        <div className="text-[12px] text-[var(--muted)]">Status</div>
        <div className="mt-1 text-[20px] font-extrabold">Kyndra Sunrise 🌅</div>
        <div className="mt-2 text-[14px] text-[var(--muted)]">{status}</div>
      </div>
    </div>
  );
}