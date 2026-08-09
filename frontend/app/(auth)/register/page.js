"use client";
import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6 text-center">
        <h1 className="font-display text-lg font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a verification link to <span className="text-foreground">{form.email}</span>. Verify your email, then log in.
        </p>
        <Link href="/login"><Button className="mt-5 w-full">Back to login</Button></Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-lg font-semibold">Create your account</h1>
      <p className="mb-5 text-sm text-muted">Start monitoring in minutes.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-unhealthy">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Create account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="text-accent hover:underline">Log in</Link>
      </p>
    </Card>
  );
}
