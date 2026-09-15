import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { ALL_INDICATORS, drawingsStorageKey, findIndicator, type Drawing } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";
import { SignalList } from "./SignalList";

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

const CORE_INDICATOR_IDS = ["sma", "ema", "bollinger", "volume", "rsi", "macd", "stochastic"];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const CHART_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #chart { margin: 0; padding: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script src="https://unpkg.com/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js"></script>
  <script>
    var chart = LightweightCharts.createChart(document.getElementById("chart"), {
      width: window.innerWidth,
      height: window.innerHeight,
      layout: { textColor: "#333", background: { color: "transparent" } }
    });
    var series = null;
    var indicatorSeries = [];
    var indicatorPanes = [];
    var priceLines = [];
    var drawingSeries = [];
    var drawingPriceLines = [];
    var activeTool = "none";

    function seriesTypeFor(chartType) {
      if (chartType === "candlestick") return LightweightCharts.CandlestickSeries;
      if (chartType === "bar") return LightweightCharts.BarSeries;
      return LightweightCharts.LineSeries;
    }

    window.__setChartData = function (candles, chartType) {
      if (series) {
        chart.removeSeries(series);
        series = null;
      }
      if (!candles || candles.length === 0) return;
      series = chart.addSeries(seriesTypeFor(chartType));
      if (chartType === "line") {
        series.setData(candles.map(function (c) { return { time: c.time, value: c.close }; }));
      } else {
        series.setData(candles.map(function (c) {
          return { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close };
        }));
      }
      chart.timeScale().fitContent();
    };

    window.__setIndicators = function (results) {
      indicatorSeries.forEach(function (s) { chart.removeSeries(s); });
      indicatorSeries = [];
      indicatorPanes.slice().sort(function (a, b) { return b - a; }).forEach(function (p) {
        chart.removePane(p);
      });
      indicatorPanes = [];
      if (series) {
        priceLines.forEach(function (l) { series.removePriceLine(l); });
      }
      priceLines = [];

      results.forEach(function (result) {
        if (result.kind === "priceLines") {
          if (!series) return;
          result.lines.forEach(function (l) {
            priceLines.push(series.createPriceLine({ price: l.price, title: l.title, lineWidth: 1 }));
          });
          return;
        }

        var paneIndex = 0;
        if (!result.overlay) {
          var pane = chart.addPane();
          paneIndex = pane.paneIndex();
          indicatorPanes.push(paneIndex);
        }
        result.lines.forEach(function (l) {
          var seriesType = l.seriesType === "Histogram" ? LightweightCharts.HistogramSeries : LightweightCharts.LineSeries;
          var options = { color: l.color, title: l.title || "" };
          if (l.lineStyle !== undefined && l.lineStyle !== null) options.lineStyle = l.lineStyle;
          var newSeries = chart.addSeries(seriesType, options, paneIndex);
          newSeries.setData(l.points);
          indicatorSeries.push(newSeries);
        });
      });
    };

    window.__setActiveTool = function (tool) {
      activeTool = tool;
    };

    window.__setDrawings = function (drawings) {
      drawingSeries.forEach(function (s) { chart.removeSeries(s); });
      drawingSeries = [];
      if (series) {
        drawingPriceLines.forEach(function (l) { series.removePriceLine(l); });
      }
      drawingPriceLines = [];

      drawings.forEach(function (d) {
        if (d.type === "horizontalLine") {
          if (!series) return;
          drawingPriceLines.push(
            series.createPriceLine({ price: d.price, title: d.title || "", color: "#F23645", lineWidth: 2 })
          );
          return;
        }
        var points = d.point1.time <= d.point2.time ? [d.point1, d.point2] : [d.point2, d.point1];
        if (points[0].time === points[1].time) return;
        var lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
          color: "#F23645",
          lineWidth: 2,
          title: d.title || "",
        });
        lineSeries.setData([
          { time: points[0].time, value: points[0].price },
          { time: points[1].time, value: points[1].price },
        ]);
        drawingSeries.push(lineSeries);
      });
    };

    chart.subscribeClick(function (param) {
      if (activeTool === "none" || !param.point || param.time === undefined || !series) return;
      var price = series.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "chartClick", time: param.time, price: price }));
      }
    });

    window.addEventListener("resize", function () {
      chart.resize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

function buildIndicatorResults(activeIndicators: ActiveIndicator[], candles: Candle[]) {
  return activeIndicators
    .map((active) => {
      const definition = findIndicator(active.id);
      if (!definition) return null;
      const result = definition.compute(candles, active.params);
      if (result.kind === "priceLines") {
        return { kind: "priceLines", lines: result.lines };
      }
      return {
        kind: "series",
        overlay: result.overlay,
        lines: result.lines.map((l) => ({
          color: l.color,
          lineStyle: l.lineStyle,
          seriesType: l.seriesType,
          title: `${definition.name} ${l.key}`,
          points: l.points,
        })),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}

export function PriceChartWebView({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const webviewRef = useRef<WebView>(null);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>([]);
  const [search, setSearch] = useState("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("none");
  const [pendingPoint, setPendingPoint] = useState<{ time: number; price: number } | null>(null);

  const coreIndicatorLabels: Record<string, string> = {
    sma: messages.chart.smaLabel,
    ema: messages.chart.emaLabel,
    bollinger: messages.chart.bollingerLabel,
    volume: messages.chart.volumeLabel,
    rsi: messages.chart.rsiLabel,
    macd: messages.chart.macdLabel,
    stochastic: messages.chart.stochasticLabel,
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
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/symbols/candles?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&timeframe=${timeframe}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Candles request failed");
        }
        const data: CandlesResponse = await response.json();
        setCandles(data.candles);
        setWarnings(data.warnings);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [symbol, exchange, timeframe]);

  useEffect(() => {
    let cancelled = false;

    async function loadDrawings() {
      let loaded: Drawing[] = [];
      try {
        const raw = await AsyncStorage.getItem(drawingsStorageKey(exchange, symbol));
        loaded = raw ? (JSON.parse(raw) as Drawing[]) : [];
      } catch {
        loaded = [];
      }
      if (cancelled) return;
      setDrawings(loaded);
      setActiveTool("none");
      setPendingPoint(null);
    }

    loadDrawings();
    return () => {
      cancelled = true;
    };
  }, [exchange, symbol]);

  useEffect(() => {
    AsyncStorage.setItem(drawingsStorageKey(exchange, symbol), JSON.stringify(drawings)).catch(() => {
      // AsyncStorage unavailable; drawings just won't persist this session.
    });
  }, [drawings, exchange, symbol]);

  useEffect(() => {
    if (!webviewReady) return;
    const script = `window.__setChartData(${JSON.stringify(candles)}, ${JSON.stringify(chartType)}); true;`;
    webviewRef.current?.injectJavaScript(script);
  }, [webviewReady, candles, chartType]);

  useEffect(() => {
    if (!webviewReady || candles.length === 0) return;
    const results = buildIndicatorResults(activeIndicators, candles);
    const script = `window.__setIndicators(${JSON.stringify(results)}); true;`;
    webviewRef.current?.injectJavaScript(script);
  }, [webviewReady, activeIndicators, candles]);

  useEffect(() => {
    if (!webviewReady) return;
    webviewRef.current?.injectJavaScript(`window.__setActiveTool(${JSON.stringify(activeTool)}); true;`);
  }, [webviewReady, activeTool]);

  useEffect(() => {
    if (!webviewReady) return;
    const t = messages.chart;
    const payload = drawings.map((d) => ({
      ...d,
      title: d.type === "trendLine" ? t.trendLineName : t.horizontalLineName,
    }));
    webviewRef.current?.injectJavaScript(`window.__setDrawings(${JSON.stringify(payload)}); true;`);
  }, [webviewReady, drawings, messages.chart]);

  function handleWebViewMessage(event: WebViewMessageEvent) {
    let data: { type?: string; time?: number; price?: number };
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type !== "chartClick" || data.time == null || data.price == null) return;
    const { time, price } = data;

    if (activeTool === "horizontalLine") {
      setDrawings((prev) => [...prev, { id: generateId(), type: "horizontalLine", price }]);
      setActiveTool("none");
      return;
    }

    if (activeTool === "trendLine") {
      if (!pendingPoint) {
        setPendingPoint({ time, price });
        return;
      }
      if (pendingPoint.time !== time) {
        setDrawings((prev) => [
          ...prev,
          { id: generateId(), type: "trendLine", point1: pendingPoint, point2: { time, price } },
        ]);
      }
      setPendingPoint(null);
      setActiveTool("none");
    }
  }

  function selectTool(tool: DrawingTool) {
    setPendingPoint(null);
    setActiveTool((prev) => (prev === tool ? "none" : tool));
  }

  function deleteDrawing(id: string) {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }

  function drawingName(drawing: Drawing): string {
    return drawing.type === "trendLine" ? messages.chart.trendLineName : messages.chart.horizontalLineName;
  }

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

  function renderToggle<T extends string>(value: T, current: T, label: string, onPress: (v: T) => void) {
    return (
      <TouchableOpacity onPress={() => onPress(value)}>
        <Text style={[styles.toggleLabel, current === value && styles.toggleLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        {renderToggle("candlestick", chartType, messages.chart.candlestick, setChartType)}
        {renderToggle("line", chartType, messages.chart.line, setChartType)}
        {renderToggle("bar", chartType, messages.chart.bar, setChartType)}
      </View>
      <View style={styles.toggleRow}>
        {renderToggle("intraday", timeframe, messages.chart.intraday, setTimeframe)}
        {renderToggle("daily", timeframe, messages.chart.daily, setTimeframe)}
        {renderToggle("weekly", timeframe, messages.chart.weekly, setTimeframe)}
        {renderToggle("monthly", timeframe, messages.chart.monthly, setTimeframe)}
      </View>
      <View style={styles.toggleRow}>
        {CORE_INDICATOR_IDS.map((id) => (
          <TouchableOpacity key={id} onPress={() => toggleCoreIndicator(id)}>
            <Text style={[styles.toggleLabel, isActive(id) && styles.toggleLabelActive]}>
              {coreIndicatorLabels[id]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => setShowAdvanced((v) => !v)}>
        <Text style={styles.advancedToggle}>{messages.chart.advancedLabel}</Text>
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedPanel}>
          <TextInput
            style={styles.searchInput}
            placeholder={messages.chart.searchPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
          {advancedResults.length === 0 && <Text style={styles.noData}>{messages.chart.noSearchResults}</Text>}
          {advancedResults.map((def) => (
            <AdvancedIndicatorRow
              key={def.id}
              id={def.id}
              name={def.name}
              defaultParams={def.defaultParams}
              disabled={isActive(def.id)}
              periodLabel={messages.chart.periodLabel}
              addLabel={messages.chart.addButton}
              onAdd={addAdvancedIndicator}
            />
          ))}
        </View>
      )}

      {activeIndicators.length > 0 && (
        <View style={styles.activeList}>
          <Text style={styles.activeListTitle}>{messages.chart.activeIndicatorsLabel}</Text>
          {activeIndicators.map((active) => {
            const def = findIndicator(active.id);
            return (
              <View key={active.id} style={styles.activeRow}>
                <Text>{def?.name ?? active.id}</Text>
                <TouchableOpacity onPress={() => removeIndicator(active.id)}>
                  <Text style={styles.removeLink}>{messages.chart.removeButton}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => selectTool("trendLine")}>
          <Text style={[styles.toggleLabel, activeTool === "trendLine" && styles.toggleLabelActive]}>
            {messages.chart.trendLineTool}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => selectTool("horizontalLine")}>
          <Text style={[styles.toggleLabel, activeTool === "horizontalLine" && styles.toggleLabelActive]}>
            {messages.chart.horizontalLineTool}
          </Text>
        </TouchableOpacity>
        {activeTool === "trendLine" && pendingPoint && (
          <Text style={styles.hint}>{messages.chart.selectSecondPoint}</Text>
        )}
      </View>

      {drawings.length > 0 && (
        <View style={styles.activeList}>
          <Text style={styles.activeListTitle}>{messages.chart.drawingsLabel}</Text>
          {drawings.map((drawing) => (
            <View key={drawing.id} style={styles.activeRow}>
              <Text>{drawingName(drawing)}</Text>
              <TouchableOpacity onPress={() => deleteDrawing(drawing.id)}>
                <Text style={styles.removeLink}>{messages.chart.removeButton}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator />}
      {fetchFailed && <Text style={styles.warning}>{messages.common.dataUnavailable}</Text>}
      {!fetchFailed &&
        warnings.map((warning) => (
          <Text key={warning} style={styles.warning}>
            {warning}
          </Text>
        ))}

      <View style={styles.chartContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html: CHART_HTML }}
          onLoadEnd={() => setWebviewReady(true)}
          onMessage={handleWebViewMessage}
          style={styles.webview}
        />
      </View>

      <SignalList symbol={symbol} exchange={exchange} />
    </View>
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
  const [period, setPeriod] = useState(String(defaultParams.period ?? ""));

  return (
    <View style={styles.advancedRow}>
      <Text style={styles.advancedRowName}>{name}</Text>
      {hasPeriod && (
        <View style={styles.periodField}>
          <Text style={styles.periodLabel}>{periodLabel}:</Text>
          <TextInput
            style={styles.periodInput}
            keyboardType="numeric"
            value={period}
            onChangeText={setPeriod}
          />
        </View>
      )}
      <TouchableOpacity
        disabled={disabled}
        onPress={() => onAdd(id, hasPeriod ? { ...defaultParams, period: Number(period) || defaultParams.period } : defaultParams)}
      >
        <Text style={[styles.addLink, disabled && styles.addLinkDisabled]}>{addLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  toggleLabel: {
    color: "#888",
    fontWeight: "600",
  },
  toggleLabelActive: {
    color: "#111",
  },
  hint: {
    color: "#2962FF",
    fontStyle: "italic",
  },
  advancedToggle: {
    color: "#111",
    fontWeight: "700",
  },
  advancedPanel: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  advancedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
  advancedRowName: {
    flex: 1,
  },
  periodField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  periodLabel: {
    color: "#555",
    fontSize: 12,
  },
  periodInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 6,
    width: 48,
  },
  addLink: {
    color: "#2962FF",
    fontWeight: "600",
  },
  addLinkDisabled: {
    color: "#ccc",
  },
  activeList: {
    gap: 4,
  },
  activeListTitle: {
    fontWeight: "600",
    color: "#555",
  },
  activeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  removeLink: {
    color: "#c0392b",
  },
  noData: {
    color: "#888",
  },
  warning: {
    color: "#8a6d3b",
  },
  chartContainer: {
    height: 320,
  },
  webview: {
    backgroundColor: "transparent",
  },
});
