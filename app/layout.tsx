import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oxbridge Tutor | Interview & Admissions Test Prep",
  description: "Adaptive Oxford and Cambridge interview practice, admissions-test preparation and reasoning feedback for students.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Oxbridge Tutor", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
