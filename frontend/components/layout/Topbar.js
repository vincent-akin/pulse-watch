"use client";
import { useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import OrgSwitcher from "./OrgSwitcher";
import { useAuth } from "@/lib/AuthContext";
import { useOrg } from "@/lib/OrgContext";
import { useSocket } from "@/lib/useSocket";
import { LiveDot } from "@/components/ui/PulseLogo";

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const { currentOrgId } = useOrg();
  const { connected } = useSocket(currentOrgId);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-lg font-semibold">{title}</h1>
        <span
          className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted"
          title={connected ? "Receiving real-time updates" : "Real-time connection offline"}
        >
          {connected ? <LiveDot /> : <span className="h-2 w-2 rounded-full bg-faint" />}
          {connected ? "Live" : "Offline"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <OrgSwitcher />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-sm font-medium text-foreground border border-border"
          >
            {user?.firstName?.[0]?.toUpperCase() || <User size={14} />}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-border bg-surface-elevated py-1 shadow-xl">
                <p className="truncate px-3 py-2 text-xs text-muted">{user?.email}</p>
                <div className="border-t border-border" />
                <Link href="/settings/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-surface">
                  Profile
                </Link>
                <Link href="/settings/sessions" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm hover:bg-surface">
                  Sessions
                </Link>
                <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-unhealthy hover:bg-surface">
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
