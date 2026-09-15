//==================================
// src/components/LayoutSelector.tsx
//==================================


interface Props {

    layout:number;

    onChange:(count:number)=>void;

}


export default function LayoutSelector({

    layout,

    onChange

}:Props){

    return (

        <select
        
            value={layout}
        
            onChange={(e)=>
                onChange(
                    Number(
                        e.target.value
                    )
                )
            }
        
        
            style={{
        
                height:30,
        
                width:70,
        
                background:
                    "#151515",
        
                color:
                    "#ffffff",
        
                border:
                    "1px solid #3b3b3b",
        
                borderRadius:4,
        
                padding:
                    "0 10px",
        
                fontSize:14,
        
                fontWeight:700,
        
                cursor:"pointer"
        
            }}
        
        >

            {
                [
                    1,2,4,6,8
                ].map(x=>(

                    <option
                        key={x}
                        value={x}
                    >
                        {x}
                    </option>

                ))
            }

        </select>

    );

}