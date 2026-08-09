"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/apiClient";

function VerifyEmailPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!token) { setStatus("error"); return; }
    api.get("/auth/verify-email", { params: { token }, skipAuth: true })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") return <PageSpinner />;

  return (
    <Card className="p-6 text-center">
      {status === "success" ? (
        <>
          <h1 className="font-display text-lg font-semibold text-healthy">Email verified</h1>
          <p className="mt-2 text-sm text-muted">Your account is ready to go.</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-lg font-semibold text-unhealthy">Verification failed</h1>
          <p className="mt-2 text-sm text-muted">This link may have expired.</p>
        </>
      )}
      <Link href="/login"><Button className="mt-5 w-full">Back to login</Button></Link>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
