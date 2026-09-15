import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { bollingerBands, ema, macd, rsi, sma, stochastic } from "@trendus/shared";
import { useLocale } from "../lib/locale-context";

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

type IndicatorSeriesSpec = {
  seriesType: "Line" | "Histogram";
  color: string;
  lineStyle?: number;
  title?: string;
  data: { time: number; value: number }[];
};

type IndicatorSpec = {
  overlay: boolean;
  series: IndicatorSeriesSpec[];
};

const INDICATOR_IDS: IndicatorId[] = ["sma", "ema", "bollinger", "volume", "rsi", "macd", "stochastic"];

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

    window.__setIndicators = function (specs) {
      indicatorSeries.forEach(function (s) { chart.removeSeries(s); });
      indicatorSeries = [];
      indicatorPanes.slice().sort(function (a, b) { return b - a; }).forEach(function (p) {
        chart.removePane(p);
      });
      indicatorPanes = [];

      specs.forEach(function (spec) {
        var paneIndex = 0;
        if (!spec.overlay) {
          var pane = chart.addPane();
          paneIndex = pane.paneIndex();
          indicatorPanes.push(paneIndex);
        }
        spec.series.forEach(function (s) {
          var seriesType = s.seriesType === "Histogram" ? LightweightCharts.HistogramSeries : LightweightCharts.LineSeries;
          var options = { color: s.color, title: s.title || "" };
          if (s.lineStyle !== undefined && s.lineStyle !== null) options.lineStyle = s.lineStyle;
          var newSeries = chart.addSeries(seriesType, options, paneIndex);
          newSeries.setData(s.data);
          indicatorSeries.push(newSeries);
        });
      });
    };

    window.addEventListener("resize", function () {
      chart.resize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

function buildIndicatorSpecs(activeIndicators: Set<IndicatorId>, candles: Candle[]): IndicatorSpec[] {
  const specs: IndicatorSpec[] = [];

  if (activeIndicators.has("sma")) {
    const values = sma(candles, 20);
    specs.push({
      overlay: true,
      series: [
        {
          seriesType: "Line",
          color: "#2962FF",
          title: "SMA 20",
          data: values.filter((v) => v.value != null).map((v) => ({ time: v.time, value: v.value as number })),
        },
      ],
    });
  }

  if (activeIndicators.has("ema")) {
    const values = ema(candles, 20);
    specs.push({
      overlay: true,
      series: [
        {
          seriesType: "Line",
          color: "#FF6D00",
          title: "EMA 20",
          data: values.filter((v) => v.value != null).map((v) => ({ time: v.time, value: v.value as number })),
        },
      ],
    });
  }

  if (activeIndicators.has("bollinger")) {
    const values = bollingerBands(candles, 20, 2).filter((v) => v.upper != null);
    specs.push({
      overlay: true,
      series: [
        { seriesType: "Line", color: "#9C27B0", title: "BB Upper", data: values.map((v) => ({ time: v.time, value: v.upper as number })) },
        { seriesType: "Line", color: "#9C27B0", lineStyle: 2, title: "BB Middle", data: values.map((v) => ({ time: v.time, value: v.middle as number })) },
        { seriesType: "Line", color: "#9C27B0", title: "BB Lower", data: values.map((v) => ({ time: v.time, value: v.lower as number })) },
      ],
    });
  }

  if (activeIndicators.has("volume")) {
    specs.push({
      overlay: false,
      series: [
        {
          seriesType: "Histogram",
          color: "#90A4AE",
          title: "Volume",
          data: candles.map((c) => ({ time: c.time, value: c.volume ?? 0 })),
        },
      ],
    });
  }

  if (activeIndicators.has("rsi")) {
    const values = rsi(candles, 14);
    specs.push({
      overlay: false,
      series: [
        {
          seriesType: "Line",
          color: "#2962FF",
          title: "RSI 14",
          data: values.filter((v) => v.value != null).map((v) => ({ time: v.time, value: v.value as number })),
        },
      ],
    });
  }

  if (activeIndicators.has("macd")) {
    const values = macd(candles);
    specs.push({
      overlay: false,
      series: [
        { seriesType: "Line", color: "#2962FF", title: "MACD", data: values.filter((v) => v.macd != null).map((v) => ({ time: v.time, value: v.macd as number })) },
        { seriesType: "Line", color: "#FF6D00", title: "Signal", data: values.filter((v) => v.signal != null).map((v) => ({ time: v.time, value: v.signal as number })) },
        { seriesType: "Histogram", color: "#90A4AE", title: "Histogram", data: values.filter((v) => v.histogram != null).map((v) => ({ time: v.time, value: v.histogram as number })) },
      ],
    });
  }

  if (activeIndicators.has("stochastic")) {
    const values = stochastic(candles, 14, 3);
    specs.push({
      overlay: false,
      series: [
        { seriesType: "Line", color: "#2962FF", title: "%K", data: values.filter((v) => v.k != null).map((v) => ({ time: v.time, value: v.k as number })) },
        { seriesType: "Line", color: "#FF6D00", title: "%D", data: values.filter((v) => v.d != null).map((v) => ({ time: v.time, value: v.d as number })) },
      ],
    });
  }

  return specs;
}

export function PriceChartWebView({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const webviewRef = useRef<WebView>(null);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(new Set());
  const [candles, setCandles] = useState<Candle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);

  const indicatorLabels: Record<IndicatorId, string> = {
    sma: messages.chart.smaLabel,
    ema: messages.chart.emaLabel,
    bollinger: messages.chart.bollingerLabel,
    volume: messages.chart.volumeLabel,
    rsi: messages.chart.rsiLabel,
    macd: messages.chart.macdLabel,
    stochastic: messages.chart.stochasticLabel,
  };

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
    if (!webviewReady) return;
    const script = `window.__setChartData(${JSON.stringify(candles)}, ${JSON.stringify(chartType)}); true;`;
    webviewRef.current?.injectJavaScript(script);
  }, [webviewReady, candles, chartType]);

  useEffect(() => {
    if (!webviewReady || candles.length === 0) return;
    const specs = buildIndicatorSpecs(activeIndicators, candles);
    const script = `window.__setIndicators(${JSON.stringify(specs)}); true;`;
    webviewRef.current?.injectJavaScript(script);
  }, [webviewReady, activeIndicators, candles]);

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
        {INDICATOR_IDS.map((id) => (
          <TouchableOpacity key={id} onPress={() => toggleIndicator(id)}>
            <Text style={[styles.toggleLabel, activeIndicators.has(id) && styles.toggleLabelActive]}>
              {indicatorLabels[id]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
          style={styles.webview}
        />
      </View>
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
