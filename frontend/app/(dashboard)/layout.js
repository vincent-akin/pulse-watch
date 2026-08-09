import DashboardShell from "@/components/layout/DashboardShell";
import { SocketProvider } from "@/lib/SocketContext";

export default function DashboardLayout({ children }) {
  return (
    <SocketProvider>
      <DashboardShell>{children}</DashboardShell>
    </SocketProvider>
  );
}
