"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/home", label: "Home", icon: "\u{1F3E0}" },
  { href: "/calendar", label: "Calendar", icon: "\u{1F4C5}" },
  { href: "/people", label: "People", icon: "\u{1F465}" },
  { href: "/feedback", label: "Feedback", icon: "\u{1F4AC}" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-30 md:static md:bottom-auto">
      <div className="mx-auto max-w-md px-4">
        <div className="ky-card flex items-center justify-between px-3 py-2">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] ${
                  active
                    ? "text-[var(--primary)] font-bold"
                    : "text-[var(--muted)]"
                }`}
              >
                <span className="text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
