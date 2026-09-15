"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarSeries,
  CandlestickSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Messages } from "@trendus/shared";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type CandlesResponse = {
  candles: Candle[];
  warnings: string[];
};

type ChartType = "candlestick" | "line" | "bar";
type Timeframe = "intraday" | "daily" | "weekly" | "monthly";

const CHART_HEIGHT = 320;

export function PriceChart({
  exchange,
  symbol,
  messages,
}: {
  exchange: string;
  symbol: string;
  messages: Messages;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const t = messages;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFetchFailed(false);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/candles?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&timeframe=${timeframe}`,
          { signal: controller.signal, cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error("Candles request failed");
        }
        const data: CandlesResponse = await response.json();
        setCandles(data.candles);
        setWarnings(data.warnings);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [exchange, symbol, timeframe]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height: CHART_HEIGHT,
      layout: { textColor: "#333", background: { color: "transparent" } },
    });
    chartRef.current = chart;

    function handleResize() {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, CHART_HEIGHT);
      }
    }
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (candles.length === 0) return;

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries);
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      seriesRef.current = series;
    } else if (chartType === "bar") {
      const series = chart.addSeries(BarSeries);
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries);
      series.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [chartType, candles]);

  return (
    <div>
      <div role="group" aria-label={t.chart.chartTypeLabel}>
        <button type="button" aria-pressed={chartType === "candlestick"} onClick={() => setChartType("candlestick")}>
          {t.chart.candlestick}
        </button>
        <button type="button" aria-pressed={chartType === "line"} onClick={() => setChartType("line")}>
          {t.chart.line}
        </button>
        <button type="button" aria-pressed={chartType === "bar"} onClick={() => setChartType("bar")}>
          {t.chart.bar}
        </button>
      </div>

      <div role="group" aria-label={t.chart.timeframeLabel}>
        <button type="button" aria-pressed={timeframe === "intraday"} onClick={() => setTimeframe("intraday")}>
          {t.chart.intraday}
        </button>
        <button type="button" aria-pressed={timeframe === "daily"} onClick={() => setTimeframe("daily")}>
          {t.chart.daily}
        </button>
        <button type="button" aria-pressed={timeframe === "weekly"} onClick={() => setTimeframe("weekly")}>
          {t.chart.weekly}
        </button>
        <button type="button" aria-pressed={timeframe === "monthly"} onClick={() => setTimeframe("monthly")}>
          {t.chart.monthly}
        </button>
      </div>

      {loading && <p>{t.common.loading}</p>}
      {fetchFailed && <p role="alert">{t.common.dataUnavailable}</p>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <p key={warning} role="status">
            {warning}
          </p>
        ))}

      <div ref={containerRef} style={{ width: "100%" }} />
    </div>
  );
}
