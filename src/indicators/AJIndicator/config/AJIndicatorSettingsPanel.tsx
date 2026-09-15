//======================================================
// src\indicators\AJIndicator\config\AJIndicatorSettingsPanel.tsx
// TradingView Style Settings
// AJ(AI+SMC) SmartTrade
// AJIndicator
// │
// ├── config
// │     AJIndicatorSettingsPanel.tsx   ← UI
// │     AJRuntimeParameters.ts         ← Production + Developer
// │     AJSettingsBridge.ts            ← Applies settings
// │
// ├── store
// │     AJIndicatorSettingsStore.ts
// │
// └── runtime
// ======================================================

import {useState} from "react";

import {
    AJIndicatorSettingsStore
} from "../store/AJIndicatorSettingsStore";

import type {
    AJIndicatorSettings
} from "../store/AJIndicatorSettingsStore";

import {
    AJSettingsBridge
} from "./AJSettingsBridge";

//======================================================

interface Props{

    chartId:string;

    onClose:()=>void;

}

//======================================================
export default function AJSettingsPanel({

    chartId,
    onClose
}:Props) {

    const [
        settings,
        setSettings
    ] = useState<AJIndicatorSettings>(

        AJIndicatorSettingsStore.get(
            chartId
        )
    );

    //--------------------------------------------------
    // UPDATE
    //--------------------------------------------------

    function update(
        value:
            Partial<AJIndicatorSettings>
    ) {
        const next = {
            ...settings,
            ...value
        };
        setSettings(
            next
        );
        AJIndicatorSettingsStore.set(
            chartId,
            next
        );
    }

    //--------------------------------------------------
    // RENDER
    //--------------------------------------------------

    return (
	
		<div
			style={{
				position: "absolute",
				top: 50,
				left: 20,
				width: 550,
				height: "85vh",
				maxHeight: "90vh",
				background: "var(--bg-modal)",
				color: "var(--text-primary)",
				border: "1px solid var(--border-primary)",
				borderRadius: 8,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				zIndex: 999999,
				boxShadow: "var(--shadow-heavy)"
			}}
		>

        {/* HEADER */}
        <div
            style={{
                display:"flex",
                justifyContent:
                    "space-between",
                alignItems:"center",
                fontSize:20,
                fontWeight:700,
                padding:"12px 18px",
                borderBottom:
                    "1px solid var(--border-primary)",
                color:"var(--text-heading)",
                background:"var(--bg-panel)"
            }}
        >
            AJ(AI+SMC)SmartTrade
            <button
                onClick={() => {
                    AJSettingsBridge.apply(
                        chartId
                    );
                    onClose();
                }}
                style={{
                    background:"transparent",
                    color:"var(--text-primary)",
                    border:"1px solid transparent",
                    cursor:"pointer",
                    fontSize:16
                }}
            >
                ✕
            </button>
        </div>
		
        {/*=====================================
            SCROLL CONTENT
        =====================================*/}
        
        <div
            style={{
                flex:1,
                overflowY:"auto",
                padding:"20px"
            }}
        >

        <hr />
        {/* FILTERS */}
        <h4 style={{ color:"var(--text-heading)" }}>
            📊 FILTERS
        </h4>
        {
        [
            ["VWAP","useVWAP"],
            ["CVD","useCVD"],
            [
                "ADX Strength",
                "enableADXStrength"
            ],
            [
                "AMD Protection",
                "enableAMDProtection"
            ],
            [
                "CPR Rejection",
                "enableCPRRejection"
            ]

        ].map(([label,key])=>(

            <label
                key={key}
                style={{
                    marginRight:15
                }}
            >

                <input
                    type="checkbox"
                    checked={
                        settings[
                        key as keyof AJIndicatorSettings
                        ] as boolean
                    }
                    onChange={e=>
                        update({
                            [key]:
                            e.target.checked
                        })
                    }
                />
                {label}

            </label>

        ))
        }

        {/* TREND */}
        <h4>
            TREND
        </h4>

        <NumberInput
            label="Bias SMA"
            value={settings.biasSMA}
            set={v=>
                update({
                    biasSMA:v
                })
            }
        />

        <NumberInput
            label="EMA Fast"
            value={settings.emaFast}
            set={v=>
                update({
                    emaFast:v
                })
            }
        />

        <NumberInput
            label="EMA Slow"
            value={settings.emaSlow}
            set={v=>
                update({
                    emaSlow:v
                })
            }
        />
		
        {/* RISK */}
        <h4>
            RISK
        </h4>
        <NumberInput
            label="SL ATR"
            value={settings.slATR}
            set={v=>
                update({
                    slATR:v
                })
            }
        />

        <NumberInput
            label="ATR"
            value={settings.atrLength}
            set={v=>
                update({
                    atrLength:v
                })
            }
        />
        <NumberInput
            label="CPR Buffer"
            value={settings.cprBuffer}
            set={v=>
                update({
                    cprBuffer:v
                })
            }
        />

        {/* AI TRADE */}
        
        <h4>
        🤖 AI TRADE
        </h4>
        
        <select
            value={settings.tradeEngineMode}
            onChange={e=>{
                update({
                    tradeEngineMode:e.target.value as any
                });

                AJSettingsBridge.apply(

                    chartId
                
                );
            }}
            style={{
                background:"var(--bg-input)",
                color:"var(--text-primary)",
                border:"1px solid var(--border-primary)",
                borderRadius:4,
                padding:"4px 8px"
            }}
        >
			<option value="SCORE">
				SCORE — Intelligent AUTO
			</option>
			
			<option value="AI">
				AI — Manual
			</option>
			
			<option value="AI_SMC">
				AI + SMC — Manual
			</option>

        </select>

		<InfoTip
			text={
				"SCORE — Intelligent AUTO: system automatically selects SCORE, AI or AI+SMC from market conditions.\n" +
				"AI — Manual: explicitly forces AI calculation.\n" +
				"AI + SMC — Manual: explicitly forces AI+SMC calculation.\n" +
				"Advanced Crypto modifies calculation behaviour for supported crypto/gold/forex markets."
			}
		/>

        {/*==================================================
            SCALPER / PROFILE TOGGLES
            (Mirrors Pine's flat "🤖 AI Trade" group -
            all shown together, not conditionally hidden.)
        ==================================================*/}

        <div style={{ marginTop: 12 }}>

            <label style={{ display: "block", marginBottom: 6 }}>
                <input
                    type="checkbox"
                    checked={settings.scoreScalper ?? false}
                    onChange={e=>
                        update({
                            scoreScalper: e.target.checked
                        })
                    }
                />
                SCORE SCALPER
            </label>

            <label style={{ display: "block", marginBottom: 6 }}>
                <input
                    type="checkbox"
                    checked={settings.aiScalper ?? false}
                    onChange={e=>
                        update({
                            aiScalper: e.target.checked
                        })
                    }
                />
                AI SCALPER
            </label>

            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6
                }}
            >
                <span>AI+SMC SCALPER</span>
                <select
                    value={settings.smcProfile}
                    onChange={e=>{
                        update({
                            smcProfile: e.target.value as any
                        });
                        AJSettingsBridge.apply(chartId);
                    }}
                    style={{
                        background:"var(--bg-input)",
                        color:"var(--text-primary)",
                        border:"1px solid var(--border-primary)",
                        borderRadius:4,
                        padding:"4px 8px"
                    }}
                >
                    <option value="SAFE">SAFE</option>
                    <option value="SWING">SWING</option>
                    <option value="SCALPER">SCALPER</option>
                </select>
                <InfoTip text="SAFE = Best for 15m+ higher quality swing trades.&#10;SWING = Balanced structure confirmation for 5m-15m.&#10;SCALPER = Fast SMC confirmation for 1m-5m entries." />
            </label>

        </div>

        <label
            style={{
                display:"block",
                marginTop:12
            }}
        >
            <input
                type="checkbox"
                checked={
                    settings.enableAdvancedCrypto ?? false
                }
                onChange={e=>{
                    update({
                        enableAdvancedCrypto:
                            e.target.checked
                    });

                    AJSettingsBridge.apply(

                        chartId
                    
                    );
                }}
            />
            Advanced Crypto Mode
        </label>

        {/*==================================================
            SMART TRADE SYNC
        ==================================================*/}

        <hr />
        <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            SMART TRADE SYNC
            <InfoTip text="NSE ↔ BN = NIFTY/SENSEX with BANKNIFTY sync.&#10;SPX ↔ BTC = BTC with S&amp;P500 sync.&#10;NSE + SPX (ALL) = both sync engines enabled.&#10;Sync OFF = local chart execution only." />
        </h4>

        <label style={{ display: "block", marginBottom: 12 }}>
            Sync Mode{" "}
            <select
                value={settings.syncMode}
                onChange={e=>
                    update({
                        syncMode: e.target.value as any
                    })
                }
                style={{
                    background:"var(--bg-input)",
                    color:"var(--text-primary)",
                    border:"1px solid var(--border-primary)",
                    borderRadius:4,
                    padding:"4px 8px"
                }}
            >
                <option value="NSE ↔ BN">NSE ↔ BN</option>
                <option value="SPX ↔ BTC">SPX ↔ BTC</option>
                <option value="NSE + SPX (ALL)">NSE + SPX (ALL)</option>
                <option value="Sync OFF">Sync OFF</option>
            </select>
        </label>

        <div style={{ display: "flex", gap: 20 }}>
            <NumberInput
                label="SPX Detach"
                value={settings.spxDetach}
                set={v=> update({ spxDetach: v })}
            />
            <NumberInput
                label="SPX Reattach"
                value={settings.spxReattach}
                set={v=> update({ spxReattach: v })}
            />
        </div>

        <div style={{ display: "flex", gap: 20 }}>
            <NumberInput
                label="BN Detach"
                value={settings.bnDetach}
                set={v=> update({ bnDetach: v })}
            />
            <NumberInput
                label="BN Reattach"
                value={settings.bnReattach}
                set={v=> update({ bnReattach: v })}
            />
        </div>

        <div style={{ display: "flex", gap: 20 }}>
            <NumberInput
                label="Sync Bars"
                value={settings.syncBars}
                set={v=> update({ syncBars: v })}
            />
            <NumberInput
                label="Desync Bars"
                value={settings.desyncBars}
                set={v=> update({ desyncBars: v })}
            />
        </div>
		
		{/*==================================================
			DEVELOPER MODE (Indicator Lifecycle Testing)
		==================================================*/}
		
		<hr />
		<h4>
			🛠 Developer Testing Mode
		</h4>
		<label
			style={{
				display:"block",
				marginTop:12,
				marginBottom:18
			}}
		>
			<input
				type="checkbox"

				checked={
					settings.developerRuntimeOverride ?? false
				}
				onChange={e=>{
					update({
						developerRuntimeOverride:
							e.target.checked
					});
					AJSettingsBridge.apply(
						chartId
					);
				}}
			/>
			Developer Runtime Override
		</label>
		
        {/* VISIBILITY */}
        <h4>
            📊 VISIBILITY
        </h4>
        {
                [
            [
                "Zones",
                "showZones"
            ],
            [
                "RR Position",
                "showRRPosition"
            ]

        ].map(([label,key])=>(

            <label
                key={key}
                style={{
                    marginRight:15
                }}
            >
				<input
					type="checkbox"
					checked={
						settings[
						key as keyof AJIndicatorSettings
						] as boolean
					}
					onChange={e=>
						update({
							[key]:
							e.target.checked
						})
					}
				/>
				{label}
            </label>

        ))

        }


        </div>
        
		{/*=====================================
            FOOTER
        =====================================*/}
        
        <div
            style={{
                height:60,
                borderTop:
                    "1px solid var(--border-primary)",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                padding:"0 18px",
                background:"var(--bg-panel)"
            }}
        
        >
            <button
                style={{
                    background:"var(--bg-panel-secondary)",
                    color:"var(--text-primary)",
                    border:"1px solid var(--border-primary)",
                    borderRadius:4,
                    padding:"8px 14px",
                    cursor:"pointer"
                }}
            >
                Defaults
            </button>
        
            <div
                style={{
                    display:"flex",
                    gap:12
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        padding:
                            "8px 18px",
                        background:"var(--bg-panel-secondary)",
                        color:"var(--text-primary)",
                        border:"1px solid var(--border-primary)",
                        borderRadius:4,
                        cursor:"pointer"
                    }}
                >
                    Cancel
                </button>

                <button
                    onClick={() => {
                        AJSettingsBridge.apply(
                            chartId
                        );
                        onClose();
                    }}
                    style={{
                        padding:
                            "8px 18px",
                        background:"var(--accent-primary)",
                        color:"var(--text-inverse)",
                        border:"1px solid var(--accent-primary)",
                        borderRadius:4,
                        cursor:"pointer"
                    }}
                >
                    Ok
                </button>
        
            </div>
        
        </div>
        {/* CLOSE MAIN POPUP CONTAINER */}
        </div>
    );

}

//======================================================
// INFO TOOLTIP
//======================================================

function InfoTip({ text }: { text: string }) {

    return (
        <span
            title={text.replace(/&#10;/g, "\n").replace(/&amp;/g, "&")}
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "1px solid var(--border-primary)",
                color: "var(--text-muted)",
                fontSize: 11,
                cursor: "help",
                marginLeft: 6,
                userSelect: "none"
            }}
        >
            i
        </span>
    );
}

//======================================================
// NUMBER FIELD
//======================================================

function NumberInput({
    label,
    value,
    set
}:{
    label:string;
    value:number;
    set:(v:number)=>void;
}) {

    return (
        <label
            style={{
                display:"inline-flex",
                flexDirection:"column",
                margin:10,
                color:"var(--text-primary)"
            }}
        >
            {label}
            <input
                type="number"
                value={value}
                onChange={e=>
                    set(
                        Number(
                            e.target.value
                        )
                    )
                }
                style={{
                    background:"var(--bg-input)",
                    color:"var(--text-primary)",
                    border:"1px solid var(--border-primary)",
                    borderRadius:4,
                    padding:"4px 6px"
                }}
            />
        </label>
    );
}