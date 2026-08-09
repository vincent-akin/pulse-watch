"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/apiClient";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function onSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch("/auth/profile", form);
      await refresh();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setSavingPw(true);
    try {
      await api.post("/auth/change-password", pwForm);
      toast.success("Password changed.");
      setPwForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <form onSubmit={onSaveProfile} className="mt-4 space-y-4">
          <Input label="Email" value={user?.email || ""} disabled />
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Button type="submit" loading={savingProfile}>Save profile</Button>
        </form>
      </Card>

      {user?.authProvider === "password" && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Change password</h2>
          <form onSubmit={onChangePassword} className="mt-4 space-y-4">
            <Input label="Current password" type="password" required value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            <Input label="New password" type="password" required minLength={8} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            <Button type="submit" loading={savingPw}>Update password</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
