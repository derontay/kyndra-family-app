"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home", icon: "\u{1F3E0}" },
  { href: "/calendar", label: "Calendar", icon: "\u{1F4C5}" },
  { href: "/photos", label: "Photos", icon: "\u{1F4F8}" },
  { href: "/people", label: "People", icon: "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}" },
  { href: "/spaces", label: "Spaces", icon: "\u{1F3E1}" },
];

export default function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20">
      <div className="mx-auto max-w-md bg-[var(--bg)]/92 backdrop-blur border-t border-[var(--border)]">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex w-full flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] ${
                  active
                    ? "text-[var(--primary)] font-bold"
                    : "text-[var(--muted)]"
                }`}
              >
                <span className="text-[18px]">{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
