import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
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

    window.addEventListener("resize", function () {
      chart.resize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

export function PriceChartWebView({ symbol, exchange }: { symbol: string; exchange: string }) {
  const { messages } = useLocale();
  const webviewRef = useRef<WebView>(null);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);

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
