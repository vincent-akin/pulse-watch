"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { API_BASE_URL } from "@/lib/apiClient";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-lg font-semibold">Log in</h1>
      <p className="mb-5 text-sm text-muted">Welcome back — monitor what matters.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-sm text-unhealthy">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Log in</Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-faint">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a href={`${API_BASE_URL}/auth/oauth/google`}>
          <Button variant="secondary" className="w-full">Google</Button>
        </a>
        <a href={`${API_BASE_URL}/auth/oauth/github`}>
          <Button variant="secondary" className="w-full">GitHub</Button>
        </a>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        No account? <Link href="/register" className="text-accent hover:underline">Sign up</Link>
      </p>
    </Card>
  );
}
