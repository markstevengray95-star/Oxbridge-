import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GlobalFocusNav } from "@/components/global-focus-nav";
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
        <GlobalFocusNav />
        <footer className="border-t bg-white px-4 py-5 text-center text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4">
            <span>Oxbridge Tutor</span>
            <Link href="/live-interview" className="font-semibold text-[#102a43] underline underline-offset-4">Live Voice Interview</Link>
            <Link href="/ai-interview" className="font-semibold text-[#102a43] underline underline-offset-4">AI Interview</Link>
            <Link href="/interview-room" className="font-semibold text-[#102a43] underline underline-offset-4">Formal Interview Room</Link>
            <Link href="/advanced-practice" className="font-semibold text-[#147d91] underline underline-offset-4">Advanced Practice Lab</Link>
            <span>Original practice material; official providers remain the source of truth for live formats.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
