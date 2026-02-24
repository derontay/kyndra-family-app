"use client";

import SpaceSwitcher from "@/components/spaces/SpaceSwitcher";
import { useSpace } from "@/components/spaces/SpaceContext";

export default function TopBar() {
  const { activeSpaceName } = useSpace();

  return (
    <header className="px-4 pt-4">
      <div className="text-[12px] text-[var(--muted)]">
        Household
      </div>

      <div className="text-[18px] font-bold">
        {activeSpaceName}
      </div>

      <div className="mt-2">
        <SpaceSwitcher />
      </div>
    </header>
  );
}
