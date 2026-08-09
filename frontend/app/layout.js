import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { OrgProvider } from "@/lib/OrgContext";
import ToasterClient from "@/components/ui/ToasterClient";

export const metadata = {
  title: "PulseWatch",
  description: "API, website, SSL, and domain monitoring that validates the response — not just the ping.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <OrgProvider>
            {children}
            <ToasterClient />
          </OrgProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
