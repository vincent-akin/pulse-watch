"use client";
import { Toaster } from "react-hot-toast";

export default function ToasterClient() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--surface-elevated)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          fontSize: "0.875rem",
        },
        success: { iconTheme: { primary: "var(--healthy)", secondary: "var(--surface-elevated)" } },
        error: { iconTheme: { primary: "var(--unhealthy)", secondary: "var(--surface-elevated)" } },
      }}
    />
  );
}
