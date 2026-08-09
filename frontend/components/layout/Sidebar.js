"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import PulseLogo from "@/components/ui/PulseLogo";
import { NAV_SECTIONS } from "./navConfig";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <PulseLogo size={24} />
        <span className="font-display text-sm font-semibold tracking-tight">PulseWatch</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-elevated hover:text-foreground"
                    )}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
