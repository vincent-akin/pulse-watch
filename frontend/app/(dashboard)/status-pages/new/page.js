"use client";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import StatusPageForm from "@/components/status-pages/StatusPageForm";
import { api } from "@/lib/apiClient";

export default function NewStatusPagePage() {
  const router = useRouter();
  async function handleSubmit(payload) {
    const { data } = await api.post("/status-pages", payload);
    router.push(`/status-pages/${data._id}`);
  }
  return (
    <Card className="max-w-xl p-6">
      <h2 className="mb-5 font-display text-lg font-semibold">New status page</h2>
      <StatusPageForm onSubmit={handleSubmit} />
    </Card>
  );
}
