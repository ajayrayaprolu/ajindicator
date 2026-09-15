/*==================================
  src/main.tsx
  AJ Institutional
==================================*/

import {
  StrictMode,
  useEffect,
  useState
} from "react";

import {
  createRoot
} from "react-dom/client";

import "./index.css";

import "./theme/theme.css";

import App from "./App";

import {
  bootstrapRuntime
} from "./runtime/bootstrap";

import {
  ThemeProvider
} from "./theme/ThemeContext";

/*------------------------------------
  AJ Runtime Boot
------------------------------------*/

bootstrapRuntime();

/*------------------------------------
  AJTrade Welcome Gateway
------------------------------------*/

function AJWelcomeGateway({
  onEnter
}: {
  onEnter: () => void;
}) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          onEnter();
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [onEnter]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 15% 20%, rgba(59,130,246,.20), transparent 32%), radial-gradient(circle at 85% 75%, rgba(139,92,246,.20), transparent 32%), linear-gradient(135deg,#020617 0%,#07111f 50%,#050816 100%)",
        color: "#f8fafc",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px)",
          backgroundSize: "55px 55px"
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          filter: "blur(90px)",
          opacity: 0.2,
          top: -190,
          left: -140,
          background: "#2563eb"
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          filter: "blur(90px)",
          opacity: 0.2,
          right: -170,
          bottom: -180,
          background: "#7c3aed"
        }}
      />

      <section
        style={{
          position: "relative",
          zIndex: 2,
          width: "min(720px, calc(100% - 40px))",
          padding: "64px 48px",
          textAlign: "center",
          border:
            "1px solid rgba(148,163,184,.18)",
          borderRadius: 28,
          background:
            "rgba(15,23,42,.76)",
          boxShadow:
            "0 30px 100px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05)",
          backdropFilter: "blur(18px)"
        }}
      >

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            border:
              "1px solid rgba(96,165,250,.25)",
            borderRadius: 999,
            background:
              "rgba(37,99,235,.10)",
            color: "#93c5fd",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform: "uppercase"
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow:
                "0 0 12px rgba(34,197,94,.8)"
            }}
          />

          Intelligent Trading Technology
        </div>

        <h1
          style={{
            margin: "28px 0 12px",
            fontSize:
              "clamp(42px, 8vw, 76px)",
            lineHeight: 0.95,
            letterSpacing: "-.055em",
            fontWeight: 800
          }}
        >
          Welcome to
          <br />

          <span
            style={{
              background:
                "linear-gradient(90deg,#60a5fa,#a78bfa,#38bdf8)",
              WebkitBackgroundClip:
                "text",
              backgroundClip: "text",
              color: "transparent"
            }}
          >
            AJTrade.in
          </span>
        </h1>

        <p
          style={{
            margin: "0 auto",
            maxWidth: 570,
            color: "#94a3b8",
            fontSize: 17,
            lineHeight: 1.7
          }}
        >
          Intelligent institutional-style trading,
          market intelligence, advanced analytics,
          and automated trading technology.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 10,
            margin: "28px 0 34px"
          }}
        >

          {[
            "AI Trading",
            "Smart Money Concepts",
            "Market Intelligence",
            "Advanced Analytics"
          ].map((item) => (
            <div
              key={item}
              style={{
                padding: "9px 13px",
                border:
                  "1px solid rgba(148,163,184,.14)",
                borderRadius: 10,
                background:
                  "rgba(30,41,59,.55)",
                color: "#cbd5e1",
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {item}
            </div>
          ))}

        </div>

        <button
          type="button"
          onClick={onEnter}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            minWidth: 230,
            padding: "15px 24px",
            border: 0,
            borderRadius: 13,
            color: "white",
            fontSize: 15,
            fontWeight: 800,
            background:
              "linear-gradient(135deg,#2563eb,#7c3aed)",
            boxShadow:
              "0 12px 35px rgba(37,99,235,.28)",
            cursor: "pointer"
          }}
        >
          Enter AJ Institutional
          <span aria-hidden="true">→</span>
        </button>

        <div
          style={{
            marginTop: 22,
            color: "#64748b",
            fontSize: 12
          }}
        >
          Opening AJ Institutional in{" "}
          <strong style={{ color: "#cbd5e1" }}>
            {seconds}
          </strong>{" "}
          seconds…
        </div>

        <div
          style={{
            width: "min(300px,80%)",
            height: 3,
            margin: "13px auto 0",
            overflow: "hidden",
            borderRadius: 999,
            background:
              "rgba(148,163,184,.12)"
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(seconds / 5) * 100}%`,
              background:
                "linear-gradient(90deg,#3b82f6,#8b5cf6)",
              transition:
                "width 1s linear"
            }}
          />
        </div>

        <div
          style={{
            marginTop: 34,
            color: "#475569",
            fontSize: 11,
            letterSpacing: ".04em"
          }}
        >
          AJ Institutional · Intelligent Market Technology
        </div>

      </section>
    </div>
  );
}

/*------------------------------------
  React Application
------------------------------------*/

function AJRoot() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return (
      <AJWelcomeGateway
        onEnter={() => setEntered(true)}
      />
    );
  }

  return (
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
}

/*------------------------------------
  Mount AJ Institutional
------------------------------------*/

createRoot(
  document.getElementById("root")!
).render(
  <AJRoot />
);
