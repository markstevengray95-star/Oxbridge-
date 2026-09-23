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
        {children}
        <CommandPalette />
        <GlobalFocusNav />
        <footer className="border-t bg-white px-4 py-6 text-sm text-slate-600">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <span className="font-semibold text-[#102a43]">Oxbridge Tutor</span>
              <Link href="/student-home" className="font-semibold text-[#102a43] underline underline-offset-4">Student Home</Link>
              <Link href="/interviews" className="font-semibold text-[#102a43] underline underline-offset-4">Interview Hub</Link>
              <Link href="/advanced-practice" className="font-semibold text-[#147d91] underline underline-offset-4">Advanced Practice</Link>
              <Link href="/adaptive-paper" className="font-semibold text-[#147d91] underline underline-offset-4">Adaptive Paper</Link>
              <Link href="/reasoning-lab" className="font-semibold text-[#147d91] underline underline-offset-4">Reasoning Lab</Link>
              <Link href="/essay-tutor" className="font-semibold text-[#147d91] underline underline-offset-4">Essay Tutor</Link>
              <Link href="/written-work-vault" className="font-semibold text-[#147d91] underline underline-offset-4">Written Work</Link>
              <Link href="/requirements" className="font-semibold text-[#147d91] underline underline-offset-4">Requirements</Link>
              <Link href="/course-bank" className="font-semibold text-[#147d91] underline underline-offset-4">Course Bank</Link>
              <Link href="/reading-room" className="font-semibold text-[#147d91] underline underline-offset-4">Reading Room</Link>
              <Link href="/knowledge-graph" className="font-semibold text-[#147d91] underline underline-offset-4">Knowledge Graph</Link>
              <Link href="/research-project" className="font-semibold text-[#147d91] underline underline-offset-4">Research Project</Link>
              <Link href="/accessibility-profiles" className="font-semibold text-[#147d91] underline underline-offset-4">Accessibility</Link>
            </div>
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">Original practice material; official university and test-provider guidance remains the source of truth for live application requirements and test formats.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
