export const CriticalBugs = [

{
    severity: "CRITICAL",

    title:
    "EXECUTED requires lifecycle lock before entry",

    evidence: [

        "Section17 => EXECUTED created when !tradeLifecycleLocked",

        "Section17A => strategy.entry requires tradeLifecycleLocked"
    ]
},

{
    severity: "CRITICAL",

    title:
    "No lifecycle assignment observed",

    evidence: [

        "No tradeLifecycleLocked := true",

        "No tradeLifecycleLocked := false"
    ]
},

{
    severity: "HIGH",

    title:
    "Dashboard PnL may diverge from strategy report",

    evidence: [

        "EntryPrice manually maintained",

        "Risk manually maintained",

        "TP manually maintained"
    ]
}

]
