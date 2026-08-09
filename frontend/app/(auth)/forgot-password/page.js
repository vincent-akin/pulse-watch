"use client";
import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email }, { skipAuth: true });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-lg font-semibold">Reset your password</h1>
      <p className="mb-5 text-sm text-muted">We&apos;ll email you a reset link if an account exists.</p>

      {sent ? (
        <p className="text-sm text-healthy">If an account exists for that email, a reset link has been sent.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">Back to login</Link>
      </p>
    </Card>
  );
}
