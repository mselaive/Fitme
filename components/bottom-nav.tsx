"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Dumbbell, Home, Settings, TrendingUp } from "lucide-react";

const items = [
  { href: "/", label: "Hoy", icon: Home },
  { href: "/train", label: "Entrenar", icon: Dumbbell },
  { href: "/food", label: "Comida", icon: Camera, primary: true },
  { href: "/progress", label: "Progreso", icon: TrendingUp },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          if (primary) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  className={`-mt-5 flex size-14 items-center justify-center rounded-full shadow-lg ring-4 ring-bg transition active:scale-95 ${
                    active ? "bg-fg text-bg" : "bg-accent text-accent-fg"
                  }`}
                >
                  <Icon className="size-7" strokeWidth={2.4} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
