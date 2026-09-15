//=====================================
// .\src\store\ChartStore.ts
//=====================================

import { create } from "zustand";

interface ChartState {

  symbol: string;

  setSymbol: (symbol: string) => void;
}

export const useChartStore =
  create<ChartState>((set) => ({

    symbol: "NIFTY",

    setSymbol: (symbol) =>
      set({ symbol })

  }));
