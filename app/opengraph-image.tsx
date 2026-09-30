import { ImageResponse } from "next/og"

export const alt = "ScholarBridge Oxford and Cambridge admissions preparation"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 82px",
        background: "linear-gradient(135deg, #0f2942 0%, #123f58 58%, #147d91 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 58,
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
            background: "rgba(255,255,255,.14)",
            border: "1px solid rgba(255,255,255,.24)",
            fontSize: 31,
            fontWeight: 800,
          }}
        >
          S
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>ScholarBridge</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 940 }}>
        <div style={{ fontSize: 68, lineHeight: 1.04, fontWeight: 800, letterSpacing: -2.5 }}>
          Oxford & Cambridge admissions preparation
        </div>
        <div style={{ fontSize: 29, lineHeight: 1.35, color: "#d9eef1" }}>
          Interviews · Admissions tests · Written work · Personalised preparation
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 22, color: "#c7e4e8" }}>
        Structured practice. Clear feedback. Your preparation in one place.
      </div>
    </div>,
    size,
  )
}
