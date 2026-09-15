//======================================
// src/components/AIActionsMenu.tsx
// AJ v2 - AI Actions Menu
//======================================

import {
  useEffect,
  useRef,
  useState
} from "react";

//======================================
// TYPES
//======================================

interface AIAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  isNew?: boolean;
}

interface AIActionGroup {
  title: string;
  actions: AIAction[];
}

//======================================
// ACTION CATALOG
//======================================

const ACTION_GROUPS: AIActionGroup[] = [
  {
    title: "Analysis",

    actions: [
      {
        id: "market-analysis",
        label: "Market Analysis",
        description:
          "Analyze the current market structure",
        icon: "◈"
      },

      {
        id: "technical-analysis",
        label: "Technical Analysis",
        description:
          "Analyze price action and indicators",
        icon: "⌁"
      },

      {
        id: "trend-analysis",
        label: "Trend Analysis",
        description:
          "Identify the current market trend",
        icon: "↗"
      },

      {
        id: "support-resistance",
        label: "Support & Resistance",
        description:
          "Identify key support and resistance levels",
        icon: "⇅"
      }
    ]
  },

  {
    title: "Trading",

    actions: [
      {
        id: "trade-setup",
        label: "Find Trade Setup",
        description:
          "Find potential trading opportunities",
        icon: "◎",
        isNew: true
      },

      {
        id: "option-analysis",
        label: "Options Analysis",
        description:
          "Analyze option chain and Greeks",
        icon: "Ω",
        isNew: true
      },

      {
        id: "risk-analysis",
        label: "Risk Analysis",
        description:
          "Evaluate trade risk and reward",
        icon: "△"
      }
    ]
  },

  {
    title: "AI Tools",

    actions: [
      {
        id: "chart-summary",
        label: "Explain Chart",
        description:
          "Generate an AI explanation of the chart",
        icon: "✦"
      },

      {
        id: "generate-alert",
        label: "Generate Alert",
        description:
          "Create an intelligent market alert",
        icon: "♢"
      },

      {
        id: "ai-insights",
        label: "AI Insights",
        description:
          "Generate contextual market insights",
        icon: "✧"
      }
    ]
  }
];

//======================================
// COMPONENT
//======================================

export default function AIActionsMenu() {
  const [open, setOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  //====================================
  // CLOSE WHEN CLICKING OUTSIDE
  //====================================

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  //====================================
  // FILTER ACTIONS
  //====================================

  const query =
    search.trim().toLowerCase();

  const filteredGroups =
    ACTION_GROUPS
      .map((group) => ({
        ...group,

        actions:
          group.actions.filter(
            (action) =>
              action.label
                .toLowerCase()
                .includes(query) ||
              action.description
                .toLowerCase()
                .includes(query)
          )
      }))
      .filter(
        (group) =>
          group.actions.length > 0
      );

  //====================================
  // ACTION HANDLER
  //====================================

  function handleAction(
    action: AIAction
  ) {
    console.log(
      "[AJ AI Action]",
      action.id
    );

    setOpen(false);
    setSearch("");
  }

  //====================================
  // RENDER
  //====================================

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        flexShrink: 0
      }}
    >
      {/*================================
          AI ACTIONS BUTTON
      =================================*/}

      <button
        type="button"
        title="AI Actions"
        aria-label="AI Actions"
        aria-expanded={open}
        onClick={() =>
          setOpen(
            (previous) => !previous
          )
        }
        style={{
          height: 30,

          display: "flex",
          alignItems: "center",

          gap: 7,

          padding: "0 10px",

          background: open
            ? "var(--bg-hover)"
            : "var(--bg-panel)",

          color:
            "var(--text-primary)",

          border:
            "1px solid var(--border-primary)",

          borderRadius: 4,

          cursor: "pointer",

          fontSize: 13,

          fontWeight: 700
        }}
      >
        <span
          style={{
            color:
              "var(--accent-primary)",

            fontSize: 15
          }}
        >
          ✦
        </span>

        <span>
          AI Actions
        </span>

        <span
          style={{
            color:
              "var(--text-muted)",

            fontSize: 10
          }}
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/*================================
          DROPDOWN
      =================================*/}

      {open && (
        <div
          style={{
            position: "absolute",

            zIndex: 2147483647,

            top:
              "calc(100% + 5px)",

            right: 0,

            width: 330,

            maxHeight: 540,

            display: "flex",

            flexDirection: "column",

            background:
              "var(--bg-panel)",

            border:
              "1px solid var(--border-primary)",

            borderRadius: 6,

            boxShadow:
              "0 8px 24px rgba(0,0,0,0.45)",

            overflow: "hidden"
          }}
        >
          {/*================================
              HEADER
          =================================*/}

          <div
            style={{
              padding:
                "11px 12px 9px",

              borderBottom:
                "1px solid var(--border-primary)"
            }}
          >
            <div
              style={{
                marginBottom: 8,

                color:
                  "var(--text-primary)",

                fontSize: 14,

                fontWeight: 700
              }}
            >
              AI Actions
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search AI actions..."
              autoFocus
              style={{
                width: "100%",

                height: 32,

                boxSizing:
                  "border-box",

                padding:
                  "0 10px",

                background:
                  "var(--bg-input)",

                color:
                  "var(--text-primary)",

                border:
                  "1px solid var(--border-primary)",

                borderRadius: 4,

                outline: "none",

                fontSize: 12
              }}
            />
          </div>

          {/*================================
              ACTION LIST
          =================================*/}

          <div
            style={{
              padding:
                "6px 5px 8px",

              overflowY:
                "auto"
            }}
          >
            {filteredGroups.length === 0 ? (
              <div
                style={{
                  padding:
                    "30px 15px",

                  textAlign:
                    "center",

                  color:
                    "var(--text-muted)",

                  fontSize: 12
                }}
              >
                No AI actions found.
              </div>
            ) : (
              filteredGroups.map(
                (group) => (
                  <div
                    key={group.title}
                    style={{
                      marginBottom: 7
                    }}
                  >
                    {/*========================
                        GROUP TITLE
                    =========================*/}

                    <div
                      style={{
                        padding:
                          "6px 9px 5px",

                        color:
                          "var(--text-muted)",

                        fontSize: 10,

                        fontWeight: 700,

                        textTransform:
                          "uppercase",

                        letterSpacing:
                          "0.05em"
                      }}
                    >
                      {group.title}
                    </div>

                    {/*========================
                        GROUP ACTIONS
                    =========================*/}

                    {group.actions.map(
                      (action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() =>
                            handleAction(
                              action
                            )
                          }
                          style={{
                            width: "100%",

                            display: "flex",

                            alignItems:
                              "center",

                            gap: 10,

                            padding:
                              "8px 9px",

                            background:
                              "transparent",

                            color:
                              "var(--text-primary)",

                            border: "none",

                            borderRadius: 4,

                            cursor:
                              "pointer",

                            textAlign:
                              "left"
                          }}
                        >
                          {/*====================
                              ICON
                          =====================*/}

                          <span
                            style={{
                              width: 27,
                              height: 27,

                              display: "flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "center",

                              flexShrink: 0,

                              background:
                                "var(--bg-panel-secondary)",

                              border:
                                "1px solid var(--border-primary)",

                              borderRadius: 4,

                              color:
                                "var(--accent-primary)",

                              fontSize: 13,

                              fontWeight: 700
                            }}
                          >
                            {action.icon}
                          </span>

                          {/*====================
                              TEXT
                          =====================*/}

                          <span
                            style={{
                              flex: 1,
                              minWidth: 0
                            }}
                          >
                            <span
                              style={{
                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                gap: 6,

                                fontSize: 12,

                                fontWeight: 600
                              }}
                            >
                              {action.label}

                              {action.isNew && (
                                <span
                                  style={{
                                    padding:
                                      "2px 5px",

                                    background:
                                      "var(--accent-primary)",

                                    color:
                                      "#ffffff",

                                    borderRadius: 3,

                                    fontSize: 8,

                                    fontWeight: 800
                                  }}
                                >
                                  New
                                </span>
                              )}
                            </span>

                            <span
                              style={{
                                display:
                                  "block",

                                marginTop: 2,

                                color:
                                  "var(--text-muted)",

                                fontSize: 10,

                                whiteSpace:
                                  "nowrap",

                                overflow:
                                  "hidden",

                                textOverflow:
                                  "ellipsis"
                              }}
                            >
                              {
                                action.description
                              }
                            </span>
                          </span>

                          {/*====================
                              ARROW
                          =====================*/}

                          <span
                            style={{
                              color:
                                "var(--text-muted)",

                              fontSize: 13
                            }}
                          >
                            ›
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}