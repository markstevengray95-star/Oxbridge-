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
        <CloudProgressSync />
        <AccountDataMirror />
        <GlobalFocusNav />
        {children}
        <CommandPalette />
        <PrivacyConsentBanner />
        <footer className="border-t bg-white px-4 py-6 text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div>
              <span className="font-semibold text-[#102a43]">ScholarBridge</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">AI-powered university admissions preparation. Original practice material; official university and test-provider guidance remains the source of truth for live application requirements and test formats.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
              <Link href="/student-home" className="text-[#102a43] hover:underline">Student Home</Link>
              <Link href="/interviews" className="text-[#147d91] hover:underline">Interview Hub</Link>
              <Link href="/requirements" className="text-[#147d91] hover:underline">Requirements</Link>
              <Link href="/privacy" className="text-[#147d91] hover:underline">Privacy</Link>
              <Link href="/cookies" className="text-[#147d91] hover:underline">Cookies</Link>
              <Link href="/account" className="text-[#147d91] hover:underline">Account</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
