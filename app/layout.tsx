import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
      <body className="antialiased">
        {children}
        <footer className="border-t bg-white px-4 py-5 text-center text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4">
            <span>Oxbridge Tutor</span>
            <Link href="/advanced-practice" className="font-semibold text-blue-700 underline underline-offset-4">Advanced Practice Lab</Link>
            <span>Original practice material; official providers remain the source of truth for live test formats.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
