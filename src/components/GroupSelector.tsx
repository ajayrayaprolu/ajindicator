//=================================
// src/components/GroupSelector.tsx
//=================================

interface Props {

    value:string;

    onChange:(group:string)=>void;

}


export default function GroupSelector({

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

                background:"#151515",

                color:"#ffffff",

                border:"1px solid #3b3b3b",

                borderRadius:3,

                padding:"0 8px",

                fontWeight:600,

                cursor:"pointer"

            }}

        >

            <option value="">
                ⚪
            </option>

            <option value="A">
                🟢 A
            </option>

            <option value="B">
                🔵 B
            </option>

            <option value="C">
                🟠 C
            </option>

            <option value="D">
                🟣 D
            </option>


        </select>

    );

}