"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/apiClient";
import { setCurrentOrgId } from "@/lib/tokenStorage";
import { useOrg } from "@/lib/OrgContext";

export default function NewOrganizationPage() {
  const router = useRouter();
  const { refresh } = useOrg();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/organizations", { name });
      setCurrentOrgId(data._id);
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md p-6">
      <h2 className="font-display text-lg font-semibold">Create an organization</h2>
      <p className="mb-5 text-sm text-muted">Organizations own your monitors, incidents, and billing.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Organization name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Ltd" />
        {error && <p className="text-sm text-unhealthy">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Create organization</Button>
      </form>
    </Card>
  );
}
