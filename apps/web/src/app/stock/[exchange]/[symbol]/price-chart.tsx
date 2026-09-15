"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from "lightweight-charts";
import { bollingerBands, ema, macd, rsi, sma, stochastic, type Messages } from "@trendus/shared";

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
type IndicatorId = "sma" | "ema" | "bollinger" | "volume" | "rsi" | "macd" | "stochastic";

const CHART_HEIGHT = 320;
const INDICATOR_IDS: IndicatorId[] = ["sma", "ema", "bollinger", "volume", "rsi", "macd", "stochastic"];

function toTime(time: number): UTCTimestamp {
  return time as UTCTimestamp;
}

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
  const priceSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const indicatorSeriesRef = useRef<ISeriesApi<SeriesType>[]>([]);
  const indicatorPanesRef = useRef<number[]>([]);

  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(new Set());
  const [candles, setCandles] = useState<Candle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  const t = messages;

  const indicatorLabels: Record<IndicatorId, string> = {
    sma: t.chart.smaLabel,
    ema: t.chart.emaLabel,
    bollinger: t.chart.bollingerLabel,
    volume: t.chart.volumeLabel,
    rsi: t.chart.rsiLabel,
    macd: t.chart.macdLabel,
    stochastic: t.chart.stochasticLabel,
  };

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
      priceSeriesRef.current = null;
      indicatorSeriesRef.current = [];
      indicatorPanesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (priceSeriesRef.current) {
      chart.removeSeries(priceSeriesRef.current);
      priceSeriesRef.current = null;
    }

    if (candles.length === 0) return;

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries);
      series.setData(candles.map((c) => ({ time: toTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
      priceSeriesRef.current = series;
    } else if (chartType === "bar") {
      const series = chart.addSeries(BarSeries);
      series.setData(candles.map((c) => ({ time: toTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
      priceSeriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries);
      series.setData(candles.map((c) => ({ time: toTime(c.time), value: c.close })));
      priceSeriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [chartType, candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const series of indicatorSeriesRef.current) {
      chart.removeSeries(series);
    }
    indicatorSeriesRef.current = [];
    for (const paneIndex of [...indicatorPanesRef.current].sort((a, b) => b - a)) {
      chart.removePane(paneIndex);
    }
    indicatorPanesRef.current = [];

    if (candles.length === 0) return;

    if (activeIndicators.has("sma")) {
      const values = sma(candles, 20);
      const series = chart.addSeries(LineSeries, { color: "#2962FF", lineWidth: 2, title: "SMA 20" });
      series.setData(
        values.filter((v) => v.value != null).map((v) => ({ time: toTime(v.time), value: v.value as number }))
      );
      indicatorSeriesRef.current.push(series);
    }

    if (activeIndicators.has("ema")) {
      const values = ema(candles, 20);
      const series = chart.addSeries(LineSeries, { color: "#FF6D00", lineWidth: 2, title: "EMA 20" });
      series.setData(
        values.filter((v) => v.value != null).map((v) => ({ time: toTime(v.time), value: v.value as number }))
      );
      indicatorSeriesRef.current.push(series);
    }

    if (activeIndicators.has("bollinger")) {
      const values = bollingerBands(candles, 20, 2);
      const withData = values.filter((v) => v.upper != null);
      const upper = chart.addSeries(LineSeries, { color: "#9C27B0", lineWidth: 1, title: "BB Upper" });
      upper.setData(withData.map((v) => ({ time: toTime(v.time), value: v.upper as number })));
      const middle = chart.addSeries(LineSeries, { color: "#9C27B0", lineWidth: 1, lineStyle: 2, title: "BB Middle" });
      middle.setData(withData.map((v) => ({ time: toTime(v.time), value: v.middle as number })));
      const lower = chart.addSeries(LineSeries, { color: "#9C27B0", lineWidth: 1, title: "BB Lower" });
      lower.setData(withData.map((v) => ({ time: toTime(v.time), value: v.lower as number })));
      indicatorSeriesRef.current.push(upper, middle, lower);
    }

    if (activeIndicators.has("volume")) {
      const pane = chart.addPane();
      const paneIndex = pane.paneIndex();
      indicatorPanesRef.current.push(paneIndex);
      const series = chart.addSeries(HistogramSeries, { color: "#90A4AE", title: t.chart.volumeLabel }, paneIndex);
      series.setData(candles.map((c) => ({ time: toTime(c.time), value: c.volume ?? 0 })));
      indicatorSeriesRef.current.push(series);
    }

    if (activeIndicators.has("rsi")) {
      const pane = chart.addPane();
      const paneIndex = pane.paneIndex();
      indicatorPanesRef.current.push(paneIndex);
      const values = rsi(candles, 14);
      const series = chart.addSeries(LineSeries, { color: "#2962FF", title: "RSI 14" }, paneIndex);
      series.setData(
        values.filter((v) => v.value != null).map((v) => ({ time: toTime(v.time), value: v.value as number }))
      );
      indicatorSeriesRef.current.push(series);
    }

    if (activeIndicators.has("macd")) {
      const pane = chart.addPane();
      const paneIndex = pane.paneIndex();
      indicatorPanesRef.current.push(paneIndex);
      const values = macd(candles);
      const macdSeries = chart.addSeries(LineSeries, { color: "#2962FF", title: "MACD" }, paneIndex);
      macdSeries.setData(
        values.filter((v) => v.macd != null).map((v) => ({ time: toTime(v.time), value: v.macd as number }))
      );
      const signalSeries = chart.addSeries(LineSeries, { color: "#FF6D00", title: "Signal" }, paneIndex);
      signalSeries.setData(
        values.filter((v) => v.signal != null).map((v) => ({ time: toTime(v.time), value: v.signal as number }))
      );
      const histogramSeries = chart.addSeries(HistogramSeries, { color: "#90A4AE", title: "Histogram" }, paneIndex);
      histogramSeries.setData(
        values.filter((v) => v.histogram != null).map((v) => ({ time: toTime(v.time), value: v.histogram as number }))
      );
      indicatorSeriesRef.current.push(macdSeries, signalSeries, histogramSeries);
    }

    if (activeIndicators.has("stochastic")) {
      const pane = chart.addPane();
      const paneIndex = pane.paneIndex();
      indicatorPanesRef.current.push(paneIndex);
      const values = stochastic(candles, 14, 3);
      const kSeries = chart.addSeries(LineSeries, { color: "#2962FF", title: "%K" }, paneIndex);
      kSeries.setData(values.filter((v) => v.k != null).map((v) => ({ time: toTime(v.time), value: v.k as number })));
      const dSeries = chart.addSeries(LineSeries, { color: "#FF6D00", title: "%D" }, paneIndex);
      dSeries.setData(values.filter((v) => v.d != null).map((v) => ({ time: toTime(v.time), value: v.d as number })));
      indicatorSeriesRef.current.push(kSeries, dSeries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndicators, candles]);

  function toggleIndicator(id: IndicatorId) {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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

      <div role="group" aria-label={t.chart.indicatorsLabel}>
        {INDICATOR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={activeIndicators.has(id)}
            onClick={() => toggleIndicator(id)}
          >
            {indicatorLabels[id]}
          </button>
        ))}
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
