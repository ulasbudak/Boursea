"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { Minus, Search, TrendingUp as TrendLineIcon, X } from "lucide-react";
import {
  ALL_INDICATORS,
  drawingsStorageKey,
  findIndicator,
  type Drawing,
  type Messages,
} from "@trendus/shared";
import { Card } from "@/components/ui/card";
import { IconInput, Input } from "@/components/ui/input";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { SignalList } from "./signal-list";

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
type ActiveIndicator = { id: string; params: Record<string, number> };
type DrawingTool = "none" | "trendLine" | "horizontalLine";

const CHART_HEIGHT = 320;
const CORE_INDICATOR_IDS = ["sma", "ema", "bollinger", "volume", "rsi", "macd", "stochastic"];

function toTime(time: number): UTCTimestamp {
  return time as UTCTimestamp;
}

/** Reads the active theme's runtime CSS variable (see globals.css) so the chart matches dark/light mode. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const drawingSeriesRef = useRef<ISeriesApi<SeriesType>[]>([]);
  const drawingPriceLinesRef = useRef<IPriceLine[]>([]);

  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([]);
  const [search, setSearch] = useState("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("none");
  const [pendingPoint, setPendingPoint] = useState<{ time: number; price: number } | null>(null);

  const t = messages;
  const coreIndicatorLabels: Record<string, string> = {
    sma: t.chart.smaLabel,
    ema: t.chart.emaLabel,
    bollinger: t.chart.bollingerLabel,
    volume: t.chart.volumeLabel,
    rsi: t.chart.rsiLabel,
    macd: t.chart.macdLabel,
    stochastic: t.chart.stochasticLabel,
  };

  const advancedResults = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const advanced = ALL_INDICATORS.filter((d) => d.tier === "advanced");
    if (!normalized) return advanced;
    return advanced.filter((d) => d.name.toLowerCase().includes(normalized));
  }, [search]);

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
    let cancelled = false;

    async function load() {
      let loaded: Drawing[] = [];
      try {
        const raw = localStorage.getItem(drawingsStorageKey(exchange, symbol));
        loaded = raw ? (JSON.parse(raw) as Drawing[]) : [];
      } catch {
        loaded = [];
      }
      if (cancelled) return;
      setDrawings(loaded);
      setActiveTool("none");
      setPendingPoint(null);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [exchange, symbol]);

  useEffect(() => {
    try {
      localStorage.setItem(drawingsStorageKey(exchange, symbol), JSON.stringify(drawings));
    } catch {
      // localStorage unavailable (private browsing, quota); drawings just won't persist this session.
    }
  }, [drawings, exchange, symbol]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height: CHART_HEIGHT,
      layout: {
        textColor: cssVar("--tk-text-secondary", "#9CA3AF"),
        background: { color: "transparent" },
        panes: { separatorColor: cssVar("--tk-border-subtle", "#23262B") },
      },
      grid: {
        vertLines: { color: cssVar("--tk-border-subtle", "#23262B") },
        horzLines: { color: cssVar("--tk-border-subtle", "#23262B") },
      },
      timeScale: { borderColor: cssVar("--tk-border-default", "#2E3239") },
      rightPriceScale: { borderColor: cssVar("--tk-border-default", "#2E3239") },
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
      priceLinesRef.current = [];
      drawingSeriesRef.current = [];
      drawingPriceLinesRef.current = [];
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

    const upColor = cssVar("--tk-positive", "#34D399");
    const downColor = cssVar("--tk-negative", "#F87171");
    const accentColor = cssVar("--tk-accent", "#3B82F6");

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
      series.setData(candles.map((c) => ({ time: toTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
      priceSeriesRef.current = series;
    } else if (chartType === "bar") {
      const series = chart.addSeries(BarSeries, { upColor, downColor });
      series.setData(candles.map((c) => ({ time: toTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
      priceSeriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, { color: accentColor, lineWidth: 2 });
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
    if (priceSeriesRef.current) {
      for (const line of priceLinesRef.current) {
        priceSeriesRef.current.removePriceLine(line);
      }
    }
    priceLinesRef.current = [];

    if (candles.length === 0) return;

    for (const active of activeIndicators) {
      const definition = findIndicator(active.id);
      if (!definition) continue;
      const result = definition.compute(candles, active.params);

      if (result.kind === "priceLines") {
        if (!priceSeriesRef.current) continue;
        for (const line of result.lines) {
          const priceLine = priceSeriesRef.current.createPriceLine({
            price: line.price,
            title: line.title,
            lineWidth: 1,
          });
          priceLinesRef.current.push(priceLine);
        }
        continue;
      }

      let paneIndex = 0;
      if (!result.overlay) {
        const pane = chart.addPane();
        paneIndex = pane.paneIndex();
        indicatorPanesRef.current.push(paneIndex);
      }

      for (const line of result.lines) {
        const seriesDefinition = line.seriesType === "Histogram" ? HistogramSeries : LineSeries;
        const options: Record<string, unknown> = { color: line.color, title: `${definition.name} ${line.key}` };
        if (line.lineStyle != null) options.lineStyle = line.lineStyle;
        const series = chart.addSeries(seriesDefinition, options, paneIndex);
        series.setData(line.points.map((p) => ({ time: toTime(p.time), value: p.value })));
        indicatorSeriesRef.current.push(series);
      }
    }
  }, [activeIndicators, candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || activeTool === "none") return;

    function handleClick(param: MouseEventParams<Time>) {
      if (!param.point || param.time == null || !priceSeriesRef.current) return;
      const price = priceSeriesRef.current.coordinateToPrice(param.point.y);
      if (price == null) return;
      const time = param.time as unknown as number;

      if (activeTool === "horizontalLine") {
        setDrawings((prev) => [...prev, { id: crypto.randomUUID(), type: "horizontalLine", price }]);
        setActiveTool("none");
        return;
      }

      if (!pendingPoint) {
        setPendingPoint({ time, price });
        return;
      }

      if (pendingPoint.time !== time) {
        setDrawings((prev) => [
          ...prev,
          { id: crypto.randomUUID(), type: "trendLine", point1: pendingPoint, point2: { time, price } },
        ]);
      }
      setPendingPoint(null);
      setActiveTool("none");
    }

    chart.subscribeClick(handleClick);
    return () => chart.unsubscribeClick(handleClick);
  }, [activeTool, pendingPoint]);

  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    if (!chart || !priceSeries) return;

    for (const series of drawingSeriesRef.current) {
      chart.removeSeries(series);
    }
    drawingSeriesRef.current = [];
    for (const line of drawingPriceLinesRef.current) {
      priceSeries.removePriceLine(line);
    }
    drawingPriceLinesRef.current = [];

    const drawingColor = cssVar("--tk-warning", "#F59E0B");

    for (const drawing of drawings) {
      if (drawing.type === "horizontalLine") {
        const line = priceSeries.createPriceLine({
          price: drawing.price,
          title: t.chart.horizontalLineName,
          color: drawingColor,
          lineWidth: 2,
        });
        drawingPriceLinesRef.current.push(line);
      } else {
        const points = [drawing.point1, drawing.point2].sort((a, b) => a.time - b.time);
        if (points[0].time === points[1].time) continue;
        const series = chart.addSeries(LineSeries, { color: drawingColor, lineWidth: 2, title: t.chart.trendLineName });
        series.setData([
          { time: toTime(points[0].time), value: points[0].price },
          { time: toTime(points[1].time), value: points[1].price },
        ]);
        drawingSeriesRef.current.push(series);
      }
    }
  }, [drawings, chartType, candles, t.chart.horizontalLineName, t.chart.trendLineName]);

  function isActive(id: string): boolean {
    return activeIndicators.some((a) => a.id === id);
  }

  function toggleCoreIndicator(id: string) {
    setActiveIndicators((prev) => {
      if (prev.some((a) => a.id === id)) return prev.filter((a) => a.id !== id);
      const definition = findIndicator(id);
      return [...prev, { id, params: { ...(definition?.defaultParams ?? {}) } }];
    });
  }

  function removeIndicator(id: string) {
    setActiveIndicators((prev) => prev.filter((a) => a.id !== id));
  }

  function addAdvancedIndicator(id: string, params: Record<string, number>) {
    setActiveIndicators((prev) => (prev.some((a) => a.id === id) ? prev : [...prev, { id, params }]));
  }

  function selectTool(tool: DrawingTool) {
    setPendingPoint(null);
    setActiveTool((prev) => (prev === tool ? "none" : tool));
  }

  function deleteDrawing(id: string) {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }

  function drawingName(drawing: Drawing): string {
    return drawing.type === "trendLine" ? t.chart.trendLineName : t.chart.horizontalLineName;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={t.chart.chartTypeLabel} className="flex gap-1.5">
            <ToggleChip active={chartType === "candlestick"} onClick={() => setChartType("candlestick")}>
              {t.chart.candlestick}
            </ToggleChip>
            <ToggleChip active={chartType === "line"} onClick={() => setChartType("line")}>
              {t.chart.line}
            </ToggleChip>
            <ToggleChip active={chartType === "bar"} onClick={() => setChartType("bar")}>
              {t.chart.bar}
            </ToggleChip>
          </div>

          <div role="group" aria-label={t.chart.timeframeLabel} className="flex gap-1.5">
            <ToggleChip active={timeframe === "intraday"} onClick={() => setTimeframe("intraday")}>
              {t.chart.intraday}
            </ToggleChip>
            <ToggleChip active={timeframe === "daily"} onClick={() => setTimeframe("daily")}>
              {t.chart.daily}
            </ToggleChip>
            <ToggleChip active={timeframe === "weekly"} onClick={() => setTimeframe("weekly")}>
              {t.chart.weekly}
            </ToggleChip>
            <ToggleChip active={timeframe === "monthly"} onClick={() => setTimeframe("monthly")}>
              {t.chart.monthly}
            </ToggleChip>
          </div>
        </div>

        <div className="my-4 h-px bg-border-subtle" />

        <div role="group" aria-label={t.chart.indicatorsLabel} className="flex flex-wrap gap-1.5">
          {CORE_INDICATOR_IDS.map((id) => (
            <ToggleChip key={id} active={isActive(id)} onClick={() => toggleCoreIndicator(id)}>
              {coreIndicatorLabels[id]}
            </ToggleChip>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-accent">{t.chart.advancedLabel}</summary>
          <div className="mt-3">
            <IconInput
              icon={<Search size={16} />}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.chart.searchPlaceholder}
              aria-label={t.chart.advancedLabel}
            />
            {advancedResults.length === 0 && (
              <p className="mt-2 text-xs text-text-tertiary">{t.chart.noSearchResults}</p>
            )}
            <ul className="mt-2 flex flex-col divide-y divide-border-subtle">
              {advancedResults.map((def) => (
                <AdvancedIndicatorRow
                  key={def.id}
                  id={def.id}
                  name={def.name}
                  defaultParams={def.defaultParams}
                  disabled={isActive(def.id)}
                  periodLabel={t.chart.periodLabel}
                  addLabel={t.chart.addButton}
                  onAdd={addAdvancedIndicator}
                />
              ))}
            </ul>
          </div>
        </details>

        {activeIndicators.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-text-tertiary">{t.chart.activeIndicatorsLabel}</p>
            <ul className="flex flex-wrap gap-1.5">
              {activeIndicators.map((active) => {
                const def = findIndicator(active.id);
                return (
                  <li
                    key={active.id}
                    className="flex items-center gap-1.5 rounded-full bg-surface-hover py-1 pl-3 pr-1.5 text-xs text-text-secondary"
                  >
                    {def?.name ?? active.id}
                    <button
                      type="button"
                      aria-label={t.chart.removeButton}
                      onClick={() => removeIndicator(active.id)}
                      className="rounded-full p-0.5 text-text-tertiary transition-colors hover:bg-surface hover:text-negative"
                    >
                      <X size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="my-4 h-px bg-border-subtle" />

        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={t.chart.drawingToolsLabel} className="flex gap-1.5">
            <ToggleChip active={activeTool === "trendLine"} onClick={() => selectTool("trendLine")} className="gap-1.5">
              <TrendLineIcon size={13} className="inline -mt-0.5" /> {t.chart.trendLineTool}
            </ToggleChip>
            <ToggleChip active={activeTool === "horizontalLine"} onClick={() => selectTool("horizontalLine")} className="gap-1.5">
              <Minus size={13} className="inline -mt-0.5" /> {t.chart.horizontalLineTool}
            </ToggleChip>
          </div>
          {activeTool === "trendLine" && pendingPoint && (
            <span className="text-xs text-accent">{t.chart.selectSecondPoint}</span>
          )}
        </div>

        {drawings.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-text-tertiary">{t.chart.drawingsLabel}</p>
            <ul className="flex flex-wrap gap-1.5">
              {drawings.map((drawing) => (
                <li
                  key={drawing.id}
                  className="flex items-center gap-1.5 rounded-full bg-surface-hover py-1 pl-3 pr-1.5 text-xs text-text-secondary"
                >
                  {drawingName(drawing)}
                  <button
                    type="button"
                    aria-label={t.chart.removeButton}
                    onClick={() => deleteDrawing(drawing.id)}
                    className="rounded-full p-0.5 text-text-tertiary transition-colors hover:bg-surface hover:text-negative"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        {loading && <p className="mb-2 text-xs text-text-tertiary">{t.common.loading}</p>}
        {fetchFailed && (
          <p role="alert" className="mb-2 text-xs text-negative">
            {t.common.dataUnavailable}
          </p>
        )}
        {!fetchFailed &&
          warnings.map((warning) => (
            <p key={warning} role="status" className="mb-2 text-xs text-warning">
              {warning}
            </p>
          ))}

        <div ref={containerRef} style={{ width: "100%" }} />
      </Card>

      <SignalList exchange={exchange} symbol={symbol} messages={t} />
    </div>
  );
}

function AdvancedIndicatorRow({
  id,
  name,
  defaultParams,
  disabled,
  periodLabel,
  addLabel,
  onAdd,
}: {
  id: string;
  name: string;
  defaultParams: Record<string, number>;
  disabled: boolean;
  periodLabel: string;
  addLabel: string;
  onAdd: (id: string, params: Record<string, number>) => void;
}) {
  const hasPeriod = "period" in defaultParams;
  const [period, setPeriod] = useState(defaultParams.period ?? 0);

  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="flex-1 text-text-primary">{name}</span>
      {hasPeriod && (
        <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
          {periodLabel}
          <Input
            type="number"
            min={1}
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="w-16 px-2 py-1"
          />
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAdd(id, hasPeriod ? { ...defaultParams, period } : defaultParams)}
        className="rounded-md border border-border-default px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:opacity-40"
      >
        {addLabel}
      </button>
    </li>
  );
}
