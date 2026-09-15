//======================================================
// src/components/AJSettingsPanel.tsx
// TradingView Style Settings
// AJ(AI+SMC) SmartTrade
//======================================================

import {useState} from "react";
import {AJIndicatorSettingsStore} from "../indicators/AJIndicator/store/AJIndicatorSettingsStore";
import type {AJIndicatorSettings} from "../indicators/AJIndicator/store/AJIndicatorSettingsStore";
import {AJSettingsBridge} from "../indicators/AJIndicator/config/AJSettingsBridge";

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
                position:"absolute",
                top:40,
                left:"50%",
                transform:
                    "translateX(-50%)",
                width:500,
                height:"60vh",
                background:"#ffffff",
                color:"#000000",
                borderRadius:8,
                zIndex:999999,
                display:"flex",
                flexDirection:"column",
                boxShadow:
                    "0 10px 40px rgba(0,0,0,0.6)",
                overflow:"hidden"
            }}
        
        >

        {/* HEADER */}
		
        <div

            style={{
                display:"flex",
                justifyContent:
                    "space-between",
                fontSize:20,
                fontWeight:700
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
        <h4>
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
        >
            <option value="SCORE">
                Score Engine
            </option>
        
            <option value="AI">
                AI Trade
            </option>
        
            <option value="AI_SMC">
                AI + SMC Hybrid
            </option>
        </select>
        
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
        
        {
            null
        }
		
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
                    "1px solid #ddd",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                padding:"0 18px",
                background:"#fff"
            }}
        
        >
            <button>
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
                            "8px 18px"
                    }}
                >
                    Cancel
                </button>
       
                <button
                    onClick={onClose}
                    style={{
                        padding:
                            "8px 18px",
                        background:"#222",
                        color:"#fff"
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
                margin:10
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
            />
        </label>
    );
}