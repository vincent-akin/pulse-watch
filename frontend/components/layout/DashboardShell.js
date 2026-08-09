"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "@/lib/AuthContext";
import { useOrg } from "@/lib/OrgContext";
import { PageSpinner } from "@/components/ui/Spinner";

function titleFromPath(pathname) {
  const segment = pathname.split("/").filter(Boolean)[0] || "dashboard";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardShell({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { memberships, loading: orgLoading } = useOrg();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && !orgLoading && user && memberships.length === 0 && pathname !== "/organizations/new") {
      router.replace("/organizations/new");
    }
  }, [authLoading, orgLoading, user, memberships, pathname, router]);

  if (authLoading || !user) return <PageSpinner />;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={titleFromPath(pathname)} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
