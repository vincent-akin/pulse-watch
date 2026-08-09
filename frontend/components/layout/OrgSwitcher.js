"use client";
import { useState } from "react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useOrg } from "@/lib/OrgContext";

export default function OrgSwitcher() {
  const { memberships, currentOrg, switchOrg } = useOrg();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:border-faint"
      >
        <span className="max-w-[140px] truncate">{currentOrg?.name || "Select organization"}</span>
        <ChevronsUpDown size={14} className="text-faint" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-border bg-surface-elevated py-1 shadow-xl">
            {memberships.map((m) => (
              <button
                key={m.organization._id}
                onClick={() => { switchOrg(m.organization._id); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
              >
                <span className="truncate">{m.organization.name}</span>
                {currentOrg?._id === m.organization._id && <Check size={14} className="text-accent" />}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <Link
              href="/organizations/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-surface"
            >
              <Plus size={14} /> New organization
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
