import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GlobalFocusNav } from "@/components/global-focus-nav";
import { CommandPalette } from "@/components/command-palette";
import { CloudProgressSync } from "@/components/cloud-progress-sync";
import { AccountDataMirror } from "@/components/account-data-mirror";
import { PrivacyConsentBanner } from "@/components/privacy-consent-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarBridge | AI University Admissions Preparation",
  description: "AI-powered Oxford and Cambridge interview practice, admissions-test preparation and reasoning feedback for students.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ScholarBridge", statusBarStyle: "default" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <CloudProgressSync />
        <AccountDataMirror />
        <GlobalFocusNav />
        {children}
        <CommandPalette />
        <PrivacyConsentBanner />
        <footer className="border-t bg-white px-4 py-6 text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div><span className="font-semibold text-[#102a43]">ScholarBridge</span><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">AI-powered university admissions preparation. Practice feedback is not an official admissions decision. Official university and test-provider guidance remains the source of truth for live requirements.</p></div>
            <nav aria-label="Legal, privacy and account links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold">
              <Link href="/student-home" className="text-[#102a43] hover:underline">Student Home</Link>
              <Link href="/privacy-centre" className="text-[#147d91] hover:underline">Privacy Centre</Link>
              <Link href="/safeguarding" className="text-[#147d91] hover:underline">Safeguarding</Link>
              <Link href="/privacy" className="text-[#147d91] hover:underline">Privacy</Link>
              <Link href="/cookies" className="text-[#147d91] hover:underline">Cookies</Link>
              <Link href="/terms" className="text-[#147d91] hover:underline">Terms</Link>
              <Link href="/account" className="text-[#147d91] hover:underline">Account & billing</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
