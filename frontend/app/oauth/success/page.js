"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/tokenStorage";
import { PageSpinner } from "@/components/ui/Spinner";

function OAuthSuccessPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken });
      window.location.href = "/dashboard"; // full reload so AuthProvider picks up the new token
    } else {
      router.replace("/login");
    }
  }, [searchParams, router]);

  return <PageSpinner />;
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OAuthSuccessPageInner />
    </Suspense>
  );
}
