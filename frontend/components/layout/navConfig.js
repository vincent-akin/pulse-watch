import {
  LayoutDashboard, Activity, AlertTriangle, ShieldCheck, Globe2, MonitorSmartphone,
  BellRing, BarChart3, KeyRound, ScrollText, CreditCard, Building2, Users, Settings,
} from "lucide-react";

// Single source of truth for the sidebar — keeps every module reachable, grouped like the API Spec's modules.
export const NAV_SECTIONS = [
  {
    label: "Monitoring",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/monitors", label: "Monitors", icon: Activity },
      { href: "/incidents", label: "Incidents", icon: AlertTriangle },
      { href: "/ssl-certificates", label: "SSL Certificates", icon: ShieldCheck },
      { href: "/domains", label: "Domains", icon: Globe2 },
      { href: "/status-pages", label: "Status Pages", icon: MonitorSmartphone },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/notifications", label: "Notifications", icon: BellRing },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/members", label: "Members", icon: Users },
      { href: "/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
