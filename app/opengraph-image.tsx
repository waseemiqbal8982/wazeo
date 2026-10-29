import { ImageResponse } from "next/og";

export const alt = "Wazeo — Gradual delivery for Instagram, TikTok & YouTube";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 55%,#0f3460 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "48px",
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: 2 }}>Wazeo</div>
        <div style={{ fontSize: 34, opacity: 0.9, marginTop: 20, textAlign: "center" }}>
          Gradual delivery for Instagram, TikTok &amp; YouTube
        </div>
        <div style={{ fontSize: 20, opacity: 0.6, marginTop: 12, textAlign: "center" }}>
          Draw your own delivery curve · real prices · secure sign-in
        </div>
      </div>
    ),
    size
  );
}
