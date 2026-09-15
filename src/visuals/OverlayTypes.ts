export type OverlayKind =
  | "line"
  | "label"
  | "triangle"
  | "partial"
  | "zone";

export interface Overlay {

  id: string;

  kind: OverlayKind;

  price?: number;

  text?: string;

  color?: string;

  x?: number;

  y?: number;
}

export interface Zone {

  id: string;

  high: number;

  low: number;

  label: string;

  color: string;
}
