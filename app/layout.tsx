import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oxbridge Tutor | Interview & Admissions Test Prep",
  description: "Adaptive Oxford and Cambridge interview practice, admissions-test preparation and reasoning feedback for students.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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
