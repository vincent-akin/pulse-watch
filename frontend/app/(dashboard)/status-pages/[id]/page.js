"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ExternalLink, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import StatusPageForm from "@/components/status-pages/StatusPageForm";
import { api } from "@/lib/apiClient";

export default function EditStatusPagePage() {
  const { id } = useParams();
  const router = useRouter();
  const [page, setPage] = useState(null);
  const [etag, setEtag] = useState(null);

  useEffect(() => {
    api.get(`/status-pages/${id}`).then(({ data, etag: tag }) => { setPage(data); setEtag(tag); });
  }, [id]);

  async function handleSubmit(payload) {
    const { title, isPublic, monitorIds } = payload;
    const { data, etag: newTag } = await api.patch(`/status-pages/${id}`, { title, isPublic, monitorIds }, { ifMatch: etag });
    setPage(data);
    setEtag(newTag);
    toast.success("Status page updated.");
  }

  async function onDelete() {
    if (!confirm(`Delete status page "${page.title}"?`)) return;
    await api.delete(`/status-pages/${id}`);
    toast.success("Status page deleted.");
    router.push("/status-pages");
  }

  if (!page) return <PageSpinner />;

  return (
    <Card className="max-w-xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Edit status page</h2>
        <div className="flex gap-2">
          <a href={`/status/${page.slug}`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm"><ExternalLink size={14} /> View public page</Button>
          </a>
          <Button variant="danger" size="sm" onClick={onDelete}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>
      <StatusPageForm
        initial={{ title: page.title, isPublic: page.isPublic, monitorIds: (page.monitorIds || []).map((m) => (typeof m === "string" ? m : m._id)) }}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
      />
    </Card>
  );
}
