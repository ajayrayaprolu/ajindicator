//======================================================
// src/components/IndicatorSettingsPanel.tsx
// TradingView Style Indicator Settings Router
// src/
//  └── indicators/
//       └── AJIndicator/
//            ├── config/
//            │     AJIndicatorSettingsPanel.tsx
//            │     AJSettingsBridge.ts
//            │     AJRuntimeParameters.ts
//            │
//            └── store/
//                  AJIndicatorSettingsStore.ts
//======================================================

import AJIndicatorSettingsPanel from "../indicators/AJIndicator/config/AJIndicatorSettingsPanel";
import EMASettings from "./settings/EMASettings";
import VWAPSettings from "./settings/VWAPSettings";
import RSISettings from "./settings/RSISettings";
import ATRSettings from "./settings/ATRSettings";
import ADXSettings from "./settings/ADXSettings";
import type {ChartIndicators} from "../types/ChartConfig";

//======================================================

interface Props {
    chartId:string;
    indicator:
        keyof ChartIndicators;
    onClose:
        () => void;
}

//======================================================

export default function IndicatorSettingsPanel({
    chartId,
    indicator,
    onClose
}: Props) {

    //--------------------------------------------------
    // ROUTER
    //--------------------------------------------------

    switch (
        indicator
    ) {
        case "ema":
            return (
                <EMASettings
                    onClose={
                        onClose
                    }
                />
            );

        case "vwap":
            return (
                <VWAPSettings
                    onClose={
                        onClose
                    }
                />
            );

        case "rsi":
            return (
                <RSISettings
                    onClose={
                        onClose
                    }
                />
            );

        case "atr":
            return (
                <ATRSettings
                    onClose={
                        onClose
                    }
                />
            );

        case "adx":
            return (
                <ADXSettings
                    onClose={
                        onClose
                    }
                />
            );

        case "ajindicator":
            return (
                <AJIndicatorSettingsPanel
                    chartId={
                        chartId
                    }
                    onClose={
                        onClose
                    }
                />
            );

        default:
            return null;
    }
}