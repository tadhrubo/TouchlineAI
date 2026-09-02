import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Touchline AI - FPL Assistant & Live Matchday Tracker";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #27272a 2%, transparent 0%)",
          backgroundSize: "50px 50px",
          fontFamily: "sans-serif",
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(24, 24, 27, 0.85)",
            border: "1px solid #3f3f46",
            borderRadius: "24px",
            padding: "60px 80px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <h1
              style={{
                fontSize: "80px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                margin: 0,
                textAlign: "center",
              }}
            >
              Touchline AI
            </h1>
          </div>

          <p
            style={{
              fontSize: "34px",
              color: "#a1a1aa",
              margin: 0,
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            Smarter FPL Matchday & Transfer Planner
          </p>

          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "48px",
            }}
          >
            <div
              style={{
                padding: "12px 26px",
                background: "#22c55e",
                color: "#000000",
                borderRadius: "12px",
                fontSize: "22px",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
              }}
            >
              Live Rank Deltas
            </div>
            <div
              style={{
                padding: "12px 26px",
                background: "#27272a",
                color: "#ffffff",
                border: "1px solid #3f3f46",
                borderRadius: "12px",
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              Top 10k EO Badges
            </div>
            <div
              style={{
                padding: "12px 26px",
                background: "#27272a",
                color: "#ffffff",
                border: "1px solid #3f3f46",
                borderRadius: "12px",
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              Transfer Planner
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
