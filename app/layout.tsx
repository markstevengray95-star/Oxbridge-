import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GlobalFocusNav } from "@/components/global-focus-nav";
import { CommandPalette } from "@/components/command-palette";
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
        <GlobalFocusNav />
        {children}
        <CommandPalette />
        <footer className="border-t bg-white px-4 py-6 text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div>
              <span className="font-semibold text-[#102a43]">Oxbridge Tutor</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Original practice material; official university and test-provider guidance remains the source of truth for live application requirements and test formats.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
              <Link href="/student-home" className="text-[#102a43] hover:underline">Student Home</Link>
              <Link href="/interviews" className="text-[#147d91] hover:underline">Interview Hub</Link>
              <Link href="/requirements" className="text-[#147d91] hover:underline">Requirements</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
