export interface DrawingPoint {
  time: number;
  price: number;
}

export interface TrendLineDrawing {
  id: string;
  type: "trendLine";
  point1: DrawingPoint;
  point2: DrawingPoint;
}

export interface HorizontalLineDrawing {
  id: string;
  type: "horizontalLine";
  price: number;
}

export type Drawing = TrendLineDrawing | HorizontalLineDrawing;
