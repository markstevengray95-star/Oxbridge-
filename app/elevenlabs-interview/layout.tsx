import Script from "next/script"

export default function ElevenLabsInterviewLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <Script
      id="elevenlabs-convai-widget-script"
      src="https://unpkg.com/@elevenlabs/convai-widget-embed"
      strategy="afterInteractive"
    />
  </>
}
