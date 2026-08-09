import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function OAuthFailurePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <h1 className="font-display text-lg font-semibold text-unhealthy">Sign-in failed</h1>
        <p className="mt-2 text-sm text-muted">The OAuth sign-in attempt didn&apos;t complete. Please try again.</p>
        <Link href="/login"><Button className="mt-5 w-full">Back to login</Button></Link>
      </Card>
    </div>
  );
}
