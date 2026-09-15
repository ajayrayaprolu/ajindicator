//===================================
// src/websocket/MarketSocket.ts
//===================================
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
//===================================================
export class MarketSocket {
    connect() {
        AJLoggingGate.log("WebSocket Connected");
    }

    disconnect() {
        AJLoggingGate.log("WebSocket Disconnected");
    }
}
