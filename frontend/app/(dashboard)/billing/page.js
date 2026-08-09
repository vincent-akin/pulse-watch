"use client";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { useResource } from "@/lib/useResource";
import { useOrg, hasRole } from "@/lib/OrgContext";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

export default function BillingPage() {
  const { currentOrgId, role } = useOrg();
  const { data: plans, loading: l1 } = useResource(currentOrgId ? "/billing/plans" : null, { deps: [currentOrgId] });
  const { data: subscription, loading: l2 } = useResource(currentOrgId ? "/billing/subscription" : null, { deps: [currentOrgId] });
  const { data: invoices, loading: l3 } = useResource(currentOrgId ? "/billing/invoices" : null, { deps: [currentOrgId] });
  const canManageBilling = hasRole(role, "owner");

  async function checkout(planKey) {
    try {
      const { data } = await api.post("/billing/checkout", { planKey });
      // eslint-disable-next-line react-hooks/immutability -- window.location is a browser API, not React state
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (l1 || l2 || l3) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(plans || []).map((plan) => {
          const isCurrent = subscription?.planId?.key === plan.key;
          return (
            <Card key={plan.key} className={`p-5 ${isCurrent ? "border-accent" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{plan.name}</h3>
                {isCurrent && <Badge status="active">Current</Badge>}
              </div>
              <p className="mt-2 font-mono text-2xl">${(plan.priceMonthly / 100).toFixed(0)}<span className="text-sm text-muted">/mo</span></p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted">
                <li className="flex items-center gap-1.5"><Check size={12} className="text-healthy" /> {plan.limits.monitors === -1 ? "Unlimited" : plan.limits.monitors} monitors</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-healthy" /> {plan.limits.checkIntervalSeconds}s check interval</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-healthy" /> {plan.limits.teamMembers === -1 ? "Unlimited" : plan.limits.teamMembers} team members</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-healthy" /> {plan.limits.dataRetentionDays === -1 ? "Unlimited" : `${plan.limits.dataRetentionDays}d`} retention</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-healthy" /> {plan.limits.sslDomainMonitoring ? "SSL/domain monitoring" : "No SSL/domain monitoring"}</li>
              </ul>
              {canManageBilling && !isCurrent && (
                <Button size="sm" className="mt-4 w-full" onClick={() => checkout(plan.key)}>Upgrade</Button>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold">Invoices</h3></div>
        <Table
          columns={[
            { key: "issuedAt", header: "Date", render: (i) => <span className="text-xs">{formatDate(i.issuedAt)}</span> },
            { key: "amount", header: "Amount", render: (i) => <span className="font-mono text-xs">${(i.amount / 100).toFixed(2)}</span> },
            { key: "status", header: "Status", render: (i) => <Badge status={i.status} /> },
            { key: "hostedInvoiceUrl", header: "", render: (i) => i.hostedInvoiceUrl && <a href={i.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">View</a> },
          ]}
          rows={invoices || []}
          emptyMessage="No invoices yet."
        />
      </Card>
    </div>
  );
}
