//======================================================
// src/feeds/ZerodhaLiveFeed.ts
//======================================================
//
// AJ Institutional Terminal
//
// Zerodha Live Feed
//
// Phase 7
// Part 1
//
// Responsibilities
//
// â€¢ IDataFeed implementation
// â€¢ WebSocket connection
// â€¢ Subscription management
// â€¢ Symbol registration
// â€¢ Connection lifecycle
//
//======================================================

import type { Candle } from "../types/Candle";
import type { IDataFeed } from "../types/IDataFeed";
import axios from "axios";
import { getInstrument } from "./InstrumentMapper";
import { AJLoggingGate } from "@/indicators/AJIndicator/debug/AJLoggingGate";
//------------------------------------------------------
// TYPES
//------------------------------------------------------

interface ZerodhaTick {

    instrumentToken:number;
    tradable:boolean;
    mode:string;
    ltp:number;
    open:number;
    high:number;
    low:number;
    close:number;
    volume:number;
    averagePrice:number;
    buyQuantity:number;
    sellQuantity:number;
    lastQuantity:number;
    oi:number;
    oiHigh:number;
    oiLow:number;
    timestamp:number;
    raw:any;

}

interface TickMessage {
    type:string;
    provider:string;
    data:ZerodhaTick;

}

//------------------------------------------------------
// CLASS
//------------------------------------------------------

export class ZerodhaLiveFeed
implements IDataFeed {

    //--------------------------------------------------
    // SOCKET
    //--------------------------------------------------

    private socket?:
        WebSocket;

	//--------------------------------------------------
	// CONNECTION
	//--------------------------------------------------
	
	private connected = false;
	private reconnecting = false;
	private loggedIn = false;
	private reconnectTimer?:
		number;

    //--------------------------------------------------
    // CALLBACK
    //--------------------------------------------------

    private callback?:
        (
            candle:Candle
        )=>void;

    //--------------------------------------------------
    // SYMBOL
    //--------------------------------------------------

    private symbol = "";
    private instrumentToken = 0;

    //--------------------------------------------------
    // HEARTBEAT
    //--------------------------------------------------

    private heartbeatTimer?:
        number;

    //--------------------------------------------------
    // HISTORY
    //--------------------------------------------------

    async getHistory(
        _symbol:string,
        _timeframe="1m"
    ):Promise<Candle[]> {
        return [];
    }

    //--------------------------------------------------
    // SUBSCRIBE
    //--------------------------------------------------

    subscribe(
        symbol:string,
        callback:(
            candle:Candle
        )=>void
    ):void {
        this.symbol = symbol;
        this.callback = callback;

        //--------------------------------------------------
        // INSTRUMENT
        //--------------------------------------------------

        const instrument =
            getInstrument(
                symbol,
                "zerodha"
            );
		if (
			!instrument ||
			!instrument.instrumentToken
		) {
			AJLoggingGate.warn(
				`[ZERODHA] Instrument not found: ${symbol}`
			);
			return;
		}
        this.instrumentToken =
            instrument.instrumentToken;

        //--------------------------------------------------
        // CONNECT
        //--------------------------------------------------

		this.connect();
		}
		
		//--------------------------------------------------
		// SESSION
		//--------------------------------------------------
		
		private async checkSession(): Promise<boolean> {
		
			try {
		
				const response =
					await axios.get(
						"https://localhost:3001/api/zerodha/session"
					);
		
				this.loggedIn =
					response.data?.loggedIn === true;
		
				if (!this.loggedIn) {
		
					AJLoggingGate.warn(
						"[ZERODHA LIVE] User not logged in."
					);
				}
				return this.loggedIn;
			}
			catch (err) {
				AJLoggingGate.warn(
					"[ZERODHA LIVE] Session check failed."
				);
				this.loggedIn = false;
				return false;
			}
		}
		
		//--------------------------------------------------
		// CONNECT
		//--------------------------------------------------

		private async connect() {
			
			//--------------------------------------------------
			// SESSION
			//--------------------------------------------------
			
			if (!(await this.checkSession())) {
				AJLoggingGate.log(
					"[ZERODHA LIVE] Waiting for user login."
				);
				return;
			}
	
			if (
				this.connected ||
				this.socket
			) {
				return;
			}
	
			AJLoggingGate.log(
				"[ZERODHA LIVE]",
				"Connecting..."
			);
			this.socket =
				new WebSocket(
					"ws://localhost:3001"
				);

        //--------------------------------------------------
        // OPEN
        //--------------------------------------------------

        this.socket.onopen =
            ()=>{
                this.connected = true;
                this.reconnecting = false;
                AJLoggingGate.log(
                    "[ZERODHA LIVE]",
                    "Connected"
                );

                //--------------------------------------------------
                // REGISTER SYMBOL
                //--------------------------------------------------

                this.socket?.send(
                    JSON.stringify({
                        action:"subscribe",
                        provider:"zerodha",
                        instrumentToken:
                            this.instrumentToken,
                        symbol:
                            this.symbol
                    })
                );

                //--------------------------------------------------
                // HEARTBEAT
                //--------------------------------------------------

                this.startHeartbeat();

            };

        //--------------------------------------------------
        // MESSAGE
        //--------------------------------------------------

        this.socket.onmessage =

            event=>{
                const message:
                    TickMessage =
                    JSON.parse(
                        event.data
                    );

                if (
                    message.provider !==
                    "zerodha"
                ) {
                    return;
                }

                if (
                    message.type !==
                    "tick"
                ) {
                    return;
                }

                this.onTick(
                    message.data
                );
            };

        //--------------------------------------------------
        // CLOSE
        //--------------------------------------------------

        this.socket.onclose =

            ()=>{
                AJLoggingGate.warn(
                    "[ZERODHA LIVE]",
                    "Disconnected"
                );

                this.connected = false;
				this.loggedIn = false;
				this.socket = undefined;
				
                this.stopHeartbeat();
                if (this.loggedIn) {
				this.scheduleReconnect();
				}
				else {
					AJLoggingGate.log(
						"[ZERODHA LIVE] Login required. Reconnect cancelled."
					);
				}
            };

        //--------------------------------------------------
        // ERROR
        //--------------------------------------------------

        this.socket.onerror =
            error=>{
                AJLoggingGate.error(
                    "[ZERODHA LIVE]",
                    error
                );
            };
    }
    //--------------------------------------------------
    // LAST TICK
	//src/feeds/ZerodhaLiveFeed.ts - Part 2 Includes:
	//Tick buffering
	//Tick â†’ Candle conversion
	//Runtime callback
	//Heartbeat
	//Auto reconnect
	//Disconnect
	//Cleanup
	//Export
    //--------------------------------------------------
    //--------------------------------------------------
    // TICK
    //--------------------------------------------------

    private onTick(
        tick: ZerodhaTick
    ): void {

        //--------------------------------------------------
        // TICK -> CANDLE
        //--------------------------------------------------

        const candle: Candle = {

            time:
                Math.floor(
                    tick.timestamp / 1000
                ),

            open:
                tick.open,

            high:
                tick.high,

            low:
                tick.low,

            close:
                tick.ltp,

            volume:
                tick.volume

        };

        //--------------------------------------------------
        // CALLBACK
        //--------------------------------------------------

        this.callback?.(
            candle
        );

    }

    //--------------------------------------------------
    // HEARTBEAT
    //--------------------------------------------------

    private startHeartbeat(): void {

        this.stopHeartbeat();

        this.heartbeatTimer =
            window.setInterval(

                () => {

                    if (

                        !this.socket ||

                        this.socket.readyState !==
                        WebSocket.OPEN

                    ) {

                        return;

                    }

                    try {

                        this.socket.send(

                            JSON.stringify({

                                action:
                                    "ping"

                            })

                        );

                    }

                    catch (err) {

                        AJLoggingGate.error(

                            "[ZERODHA LIVE]",

                            err

                        );

                    }

                },

                30000

            );

    }

    //--------------------------------------------------
    // STOP HEARTBEAT
    //--------------------------------------------------

    private stopHeartbeat(): void {

        if (

            this.heartbeatTimer

        ) {

            clearInterval(

                this.heartbeatTimer

            );

            this.heartbeatTimer =
                undefined;

        }

    }

    //--------------------------------------------------
    // RECONNECT
    //--------------------------------------------------

    private scheduleReconnect(): void {

        if (

            this.reconnecting

        ) {

            return;

        }

        this.reconnecting = true;

        AJLoggingGate.log(

            "[ZERODHA LIVE]",

            "Reconnect scheduled..."

        );

        this.reconnectTimer =
            window.setTimeout(

                () => {

                    this.reconnecting = false;

                    this.connect();

                },

                5000

            );

    }

    //--------------------------------------------------
    // DISCONNECT
    //--------------------------------------------------

    disconnect(): void {
        this.stopHeartbeat();
        if (
            this.reconnectTimer
        ) {
            clearTimeout(
                this.reconnectTimer
            );
        }

        if (
            this.socket
        ) {

            try {
                if (
                    this.socket.readyState ===
                    WebSocket.OPEN
                ) {
                    this.socket.send(
                        JSON.stringify({
                            action:
                                "unsubscribe",
                            provider:
                                "zerodha",
                            instrumentToken:
                                this.instrumentToken
                        })
                    );
                }
            }

            catch (err) {
                AJLoggingGate.error(
                    "[ZERODHA LIVE]",
                    err
                );
            }

            this.socket.close();
            this.socket =
                undefined;
        }

		this.connected = false;
		this.loggedIn = false;
		this.reconnecting = false;

        AJLoggingGate.log(
            "[ZERODHA LIVE]",
            "Disconnected"
        );
    }
}

//------------------------------------------------------
// SINGLETON
//------------------------------------------------------

const zerodhaLiveFeed =
    new ZerodhaLiveFeed();

//------------------------------------------------------
// EXPORTS
//------------------------------------------------------

export default
    zerodhaLiveFeed;