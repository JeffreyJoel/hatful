import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home screen icon: the hat on spruce. iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E3A2D" }}>
        <svg width="132" height="132" viewBox="0 0 34 34">
          <path d="M6 25 C8 12 16 5 25 6 C22 12 25 18 28 25 Z" fill="#D62F3A" />
          <rect x="3" y="23" width="28" height="8" rx="4" fill="#FFFFFF" />
          <circle cx="26" cy="6" r="4" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    size,
  );
}
