"use client";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import MonitorForm from "@/components/monitors/MonitorForm";
import { api } from "@/lib/apiClient";

export default function NewMonitorPage() {
  const router = useRouter();

  async function handleSubmit(payload) {
    const { data } = await api.post("/monitors", payload);
    router.push(`/monitors/${data._id}`);
  }

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-5 font-display text-lg font-semibold">New monitor</h2>
      <MonitorForm onSubmit={handleSubmit} submitLabel="Create monitor" />
    </Card>
  );
}
