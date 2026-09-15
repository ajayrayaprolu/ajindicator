//====================================
// src/components/TimeframeSelector.tsx
//====================================

interface Props {
    value:string;
    onChange:(
        timeframe:string
    )=>void;
}


const intervals=[
    "1m",
    "5m",
    "15m",
    "30m",
    "1h",
    "4h",
    "1D",
    "1W"
];


export default function TimeframeSelector({
    value,
    onChange
}:Props){

    return (

        <select
            value={value}
            onChange={(e)=>
                onChange(
                    e.target.value
                )
            }
            style={{
                height:26,
                width:80,
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-primary)",
                borderRadius:3,
                padding: "0 8px",
                fontSize:14,
                fontWeight:700,
                cursor:"pointer"
            }}
        >
            {

            intervals.map(tf=>(
                <option
                    key={tf}
                    value={tf}
                >
                    {tf}
                </option>
            ))
            }
        </select>
    );
}