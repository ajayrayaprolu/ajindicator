//======================================
// src/components/ChartIndicatorMenu.tsx
// TradingView Style Indicator Menu
// AJ Institutional
// Global Theme Aware
//======================================

import {
  useState,
  useRef,
  useEffect
} from "react";

import {
  createPortal
} from "react-dom";

import type {
  ChartIndicators
} from "../types/ChartConfig";

//======================================
// TYPES
//======================================

interface MenuItem {

  key:
    keyof ChartIndicators;

  label:
    string;

  hasSettings:
    boolean;

}

interface Props {

  indicators:
    ChartIndicators;

  onChange: (
    indicators: ChartIndicators
  ) => void;

  onSettings?: (
    indicator:
      keyof ChartIndicators
  ) => void;

}

//======================================
// COMPONENT
//======================================

export default function ChartIndicatorMenu({

  indicators,

  onChange,

  onSettings

}: Props) {

  //====================================
  // STATE
  //====================================

  const [
    open,
    setOpen
  ] = useState(false);

  //====================================
  // BUTTON REF
  //====================================

  const buttonRef =
    useRef<HTMLButtonElement | null>(
      null
    );

  //====================================
  // MENU POSITION
  //====================================

  const [
    menuPosition,
    setMenuPosition
  ] = useState({
    top: 0,
    left: 0
  });

  //====================================
  // POSITION
  //====================================

  function updateMenuPosition() {

    if (!buttonRef.current) {
      return;
    }

    const buttonRect =
      buttonRef.current
        .getBoundingClientRect();

    const indicatorButtons =
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          "button"
        )
      ).filter(
        button =>
          button.textContent
            ?.includes(
              "Indicators"
            )
      );

    //----------------------------------
    // NORMAL LAYOUT
    //----------------------------------

    if (
      indicatorButtons.length !== 8
    ) {

      setMenuPosition({

        top:
          buttonRect.bottom + 2,

        left:
          buttonRect.left

      });

      return;
    }

    //----------------------------------
    // 8 CHART LAYOUT
    //----------------------------------

    const chartIndex =
      indicatorButtons.indexOf(
        buttonRef.current
      );

    if (
      chartIndex !== 3 &&
      chartIndex !== 7
    ) {

      setMenuPosition({

        top:
          buttonRect.bottom + 2,

        left:
          buttonRect.left

      });

      return;
    }

    const targetButton =
      indicatorButtons[
        chartIndex
      ];

    const targetRect =
      targetButton.getBoundingClientRect();

    const leftChartButton =
      indicatorButtons[2];

    const rightChartButton =
      indicatorButtons[3];

    const leftRect =
      leftChartButton
        .getBoundingClientRect();

    const rightRect =
      rightChartButton
        .getBoundingClientRect();

    const chartWidth =
      Math.abs(
        rightRect.left -
        leftRect.left
      );

    const chart4Rect =
      indicatorButtons[3]
        .getBoundingClientRect();

    const chart8Rect =
      indicatorButtons[7]
        .getBoundingClientRect();

    const rowHeight =
      Math.abs(
        chart8Rect.top -
        chart4Rect.top
      ) / 2;

    const menuWidth =
      150;

    const menuHeight =
      194;

    let menuLeft =
      targetRect.left +
      (
        chartWidth -
        menuWidth
      ) / 2;

    let menuTop =
      targetRect.top +
      (
        rowHeight -
        menuHeight
      ) / 2;

    menuLeft =
      Math.max(
        5,
        Math.min(
          menuLeft,
          window.innerWidth -
          menuWidth -
          5
        )
      );

    menuTop =
      Math.max(
        5,
        Math.min(
          menuTop,
          window.innerHeight -
          menuHeight -
          5
        )
      );

    setMenuPosition({

      left:
        menuLeft,

      top:
        menuTop

    });

  }

  //====================================
  // OPEN
  //====================================

  function openMenu() {

    updateMenuPosition();

    setOpen(true);

  }

  //====================================
  // CLOSE
  //====================================

  function closeMenu() {

    setOpen(false);

  }

  //====================================
  // REALIGN
  //====================================

  useEffect(() => {

    if (!open) {
      return;
    }

    const update =
      () => {

        updateMenuPosition();

      };

    window.addEventListener(
      "resize",
      update
    );

    window.addEventListener(
      "scroll",
      update,
      true
    );

    return () => {

      window.removeEventListener(
        "resize",
        update
      );

      window.removeEventListener(
        "scroll",
        update,
        true
      );

    };

  }, [open]);

  //====================================
  // TOGGLE
  //====================================

  function toggle(
    key: keyof ChartIndicators
  ) {

    onChange({

      ...indicators,

      [key]:
        !indicators[key]

    });

  }

  //====================================
  // ITEMS
  //====================================

  const items:
    MenuItem[] = [

      {
        key:
          "ema",

        label:
          "EMA",

        hasSettings:
          true
      },

      {
        key:
          "vwap",

        label:
          "VWAP",

        hasSettings:
          true
      },

      {
        key:
          "rsi",

        label:
          "RSI",

        hasSettings:
          true
      },

      {
        key:
          "atr",

        label:
          "ATR",

        hasSettings:
          true
      },

      {
        key:
          "adx",

        label:
          "ADX",

        hasSettings:
          true
      },

      {
        key:
          "ajindicator",

        label:
          "AJ-IND",

        hasSettings:
          true
      }

    ];

  //====================================
  // DROPDOWN
  //====================================

  const dropdown =
    open
      ? createPortal(

          <div

            style={{

              position:
                "fixed",

              top:
                menuPosition.top,

              left:
                menuPosition.left,

              width:
                150,

              minWidth:
                150,

              background:
                "var(--bg-dropdown)",

              color:
                "var(--text-primary)",

              border:
                "1px solid var(--border-primary)",

              borderRadius:
                4,

              boxShadow:
                "var(--shadow-heavy)",

              zIndex:
                2147483647,

              overflow:
                "hidden",

              boxSizing:
                "border-box"

            }}
          >

            {
              items.map(
                item => (

                  <div

                    key={
                      item.key
                    }

                    style={{

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "space-between",

                      minHeight:
                        32,

                      padding:
                        "0 8px",

                      borderBottom:
                        "1px solid var(--border-secondary)",

                      boxSizing:
                        "border-box"

                    }}
                  >

                    <div

                      onClick={() =>
                        toggle(
                          item.key
                        )
                      }

                      style={{

                        flex: 1,

                        minWidth: 0,

                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap: 6,

                        cursor:
                          "pointer",

                        userSelect:
                          "none",

                        overflow:
                          "hidden"

                      }}
                    >

                      <input

                        type="checkbox"

                        checked={
                          Boolean(
                            indicators[
                              item.key
                            ]
                          )
                        }

                        readOnly

                      />

                      <span

                        style={{

                          color:
                            "var(--text-primary)",

                          fontSize:
                            13,

                          fontWeight:
                            500,

                          whiteSpace:
                            "nowrap",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis"

                        }}
                      >

                        {
                          item.label
                        }

                      </span>

                    </div>

                    {
                      item.hasSettings &&
                      indicators[
                        item.key
                      ] && (

                        <button

                          type="button"

                          title="Indicator Settings"

                          onClick={(
                            event
                          ) => {

                            event.stopPropagation();

                            closeMenu();

                            onSettings?.(
                              item.key
                            );

                          }}

                          style={{

                            width:
                              22,

                            minWidth:
                              22,

                            height:
                              22,

                            minHeight:
                              22,

                            flexShrink:
                              0,

                            border:
                              "1px solid var(--border-primary)",

                            borderRadius:
                              3,

                            background:
                              "var(--bg-panel-secondary)",

                            color:
                              "var(--text-secondary)",

                            cursor:
                              "pointer",

                            display:
                              "flex",

                            alignItems:
                              "center",

                            justifyContent:
                              "center",

                            fontSize:
                              12,

                            padding:
                              0

                          }}
                        >

                          ⚙

                        </button>

                      )
                    }

                  </div>

                )
              )
            }

          </div>,

          document.body

        )

      : null;

  //====================================
  // RENDER
  //====================================

  return (

    <div

      style={{

        position:
          "relative",

        height:
          26,

        minWidth:
          0,

        flexShrink:
          0,

        zIndex:
          1000000

      }}
    >

      <button

        ref={
          buttonRef
        }

        type="button"

        onClick={() => {

          if (open) {

            closeMenu();

          } else {

            openMenu();

          }

        }}

        style={{

          height:
            26,

          minWidth:
            80,

          padding:
            "0 8px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          background:
            "var(--bg-panel)",

          color:
            "var(--text-primary)",

          border:
            "1px solid var(--border-primary)",

          borderRadius:
            3,

          cursor:
            "pointer",

          fontWeight:
            600,

          fontSize:
            13

        }}
      >

        <span>
          ƒx
        </span>

        <span>
          {
            open
              ? "▲"
              : "▼"
          }
        </span>

      </button>

      {
        dropdown
      }

    </div>

  );

}