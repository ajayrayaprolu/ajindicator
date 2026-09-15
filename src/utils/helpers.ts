export const round = (v:number,d=2)=>
    Number(v.toFixed(d));

export const pct=(a:number,b:number)=>
    b===0?0:(a/b)*100;
