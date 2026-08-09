"use client";
import Link from "next/link";
import { Plus, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useOrg } from "@/lib/OrgContext";

export default function OrganizationsPage() {
  const { memberships, currentOrg, switchOrg } = useOrg();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Organizations you belong to.</p>
        <Link href="/organizations/new"><Button size="sm"><Plus size={14} /> New organization</Button></Link>
      </div>

      <Card className="divide-y divide-border">
        {memberships.map((m) => (
          <div key={m.organization._id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{m.organization.name}</p>
              <p className="text-xs text-muted">/{m.organization.slug} · {m.role}</p>
            </div>
            {currentOrg?._id === m.organization._id ? (
              <span className="flex items-center gap-1 text-xs text-accent"><Check size={14} /> Current</span>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => switchOrg(m.organization._id)}>Switch</Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
