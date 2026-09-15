export interface OhlcvPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface IndicatorPoint {
  time: number;
  value: number | null;
}
