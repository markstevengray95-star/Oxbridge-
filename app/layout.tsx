import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { GlobalFocusNav } from "@/components/global-focus-nav";
import { CommandPalette } from "@/components/command-palette";
import { CloudProgressSync } from "@/components/cloud-progress-sync";
import { AccountDataMirror } from "@/components/account-data-mirror";
import { HistoryCloudMirror } from "@/components/history-cloud-mirror";
import { PrivacyConsentBanner } from "@/components/privacy-consent-banner";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";
import "./mobile.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "ScholarBridge | Oxford & Cambridge Admissions Preparation",
    template: "%s | ScholarBridge",
  },
  description:
    "Oxford and Cambridge admissions preparation with interview practice, admissions-test preparation, written-work feedback and personalised study support.",
  applicationName: "ScholarBridge",
  keywords: [
    "Oxford admissions preparation",
    "Cambridge admissions preparation",
    "Oxbridge interview practice",
    "admissions test preparation",
    "TMUA practice",
    "ESAT practice",
    "LNAT practice",
    "UCAT practice",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "ScholarBridge",
    title: "ScholarBridge | Oxford & Cambridge Admissions Preparation",
    description:
      "Practise interviews, admissions tests, written work and academic reasoning with structured preparation for Oxford and Cambridge applications.",
    locale: "en_GB",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ScholarBridge admissions preparation" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarBridge | Oxford & Cambridge Admissions Preparation",
    description:
      "Structured Oxford and Cambridge interview, admissions-test and written-work preparation.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
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
        <HistoryCloudMirror />
        <GlobalFocusNav />
        {children}
        <CommandPalette />
        <PrivacyConsentBanner />
        <footer className="border-t bg-white px-4 py-6 text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div><span className="font-semibold text-[#102a43]">ScholarBridge</span><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">AI-powered university admissions preparation. Practice feedback is not an official admissions decision. Official university and test-provider guidance remains the source of truth for live requirements.</p></div>
            <nav aria-label="Legal, privacy, support and account links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold">
              <Link href="/student-home" className="text-[#102a43] hover:underline">Student Home</Link>
              <Link href="/history" className="text-[#147d91] hover:underline">My history</Link>
              <Link href="/privacy-centre" className="text-[#147d91] hover:underline">Privacy Centre</Link>
              <Link href="/safeguarding" className="text-[#147d91] hover:underline">Safeguarding</Link>
              <Link href="/support" className="text-[#147d91] hover:underline">Support</Link>
              <Link href="/status" className="text-[#147d91] hover:underline">Status</Link>
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
