import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import { useOHLC, type ChartInterval, type OHLCCandle } from "@/lib/coingecko";
import { Maximize2, Minimize2 } from "lucide-react";

// ─── Interval definitions ─────────────────────────────────
const INTERVALS: { key: ChartInterval; label: string; limit: number }[] = [
  { key: "1", label: "1m", limit: 200 },
  { key: "5", label: "5m", limit: 200 },
  { key: "15", label: "15m", limit: 200 },
  { key: "30", label: "30m", limit: 200 },
  { key: "60", label: "1H", limit: 200 },
  { key: "240", label: "4H", limit: 200 },
  { key: "D", label: "1D", limit: 365 },
  { key: "W", label: "1W", limit: 200 },
];

// ─── Indicator types ──────────────────────────────────────
type Indicator = "none" | "ma20" | "ma50" | "ema20" | "bb";

const INDICATORS: { key: Indicator; label: string }[] = [
  { key: "none", label: "None" },
  { key: "ma20", label: "MA 20" },
  { key: "ma50", label: "MA 50" },
  { key: "ema20", label: "EMA 20" },
  { key: "bb", label: "Bollinger" },
];

// ─── Calculation helpers ──────────────────────────────────
function calcMA(data: OHLCCandle[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calcEMA(data: OHLCCandle[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: ema });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

function calcBollingerBands(data: OHLCCandle[], period = 20, stdDev = 2) {
  const upper: { time: number; value: number }[] = [];
  const middle: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const ma = sum / period;

    let sqSum = 0;
    for (let j = 0; j < period; j++) sqSum += (data[i - j].close - ma) ** 2;
    const std = Math.sqrt(sqSum / period);

    middle.push({ time: data[i].time, value: ma });
    upper.push({ time: data[i].time, value: ma + stdDev * std });
    lower.push({ time: data[i].time, value: ma - stdDev * std });
  }

  return { upper, middle, lower };
}

// ─── Component ────────────────────────────────────────────
interface Props {
  coinId: string;
  defaultInterval?: ChartInterval;
}

export function CandlestickChart({ coinId, defaultInterval = "D" }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  const [interval, setInterval] = useState<ChartInterval>(defaultInterval);
  const [indicator, setIndicator] = useState<Indicator>("none");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedInterval = INTERVALS.find((i) => i.key === interval) ?? INTERVALS[6];
  const { data, isLoading } = useOHLC(coinId, interval, selectedInterval.limit);

  // ─── Create chart ────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(215, 20%, 70%)",
        fontSize: 11,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: "hsla(224, 30%, 18%, 0.5)" },
        horzLines: { color: "hsla(224, 30%, 18%, 0.5)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "hsla(142, 76%, 56%, 0.3)",
          labelBackgroundColor: "hsl(224, 39%, 12%)",
        },
        horzLine: {
          color: "hsla(142, 76%, 56%, 0.3)",
          labelBackgroundColor: "hsl(224, 39%, 12%)",
        },
      },
      timeScale: {
        borderColor: "hsla(224, 30%, 18%, 0.5)",
        timeVisible: ["1", "5", "15", "30", "60"].includes(interval),
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "hsla(224, 30%, 18%, 0.5)",
      },
      handleScroll: true,
      handleScale: true,
    });

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(142, 76%, 56%)",
      downColor: "hsl(0, 84%, 60%)",
      borderDownColor: "hsl(0, 84%, 60%)",
      borderUpColor: "hsl(142, 76%, 56%)",
      wickDownColor: "hsl(0, 84%, 50%)",
      wickUpColor: "hsl(142, 76%, 46%)",
    });

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRefs.current = [];
    };
  }, [interval]); // Recreate chart on interval change to update timeVisible

  // ─── Update data ─────────────────────────────────────────
  useEffect(() => {
    if (!data?.ohlc?.length || !candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

    const ohlc = data.ohlc;

    // Set candlestick data
    const candleData: CandlestickData<Time>[] = ohlc.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeriesRef.current.setData(candleData);

    // Set volume data with colors
    const volumeData = ohlc.map((d) => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? "hsla(142, 76%, 56%, 0.25)" : "hsla(0, 84%, 60%, 0.25)",
    }));
    volumeSeriesRef.current.setData(volumeData);

    // Remove old indicator series
    for (const s of indicatorSeriesRefs.current) {
      try { chartRef.current.removeSeries(s); } catch (_) {}
    }
    indicatorSeriesRefs.current = [];

    // Add indicator
    if (indicator === "ma20") {
      const maData = calcMA(ohlc, 20);
      const series = chartRef.current.addSeries(LineSeries, {
        color: "hsl(48, 96%, 53%)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(maData.map((d) => ({ time: d.time as Time, value: d.value })));
      indicatorSeriesRefs.current.push(series);
    } else if (indicator === "ma50") {
      const maData = calcMA(ohlc, 50);
      const series = chartRef.current.addSeries(LineSeries, {
        color: "hsl(258, 90%, 76%)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(maData.map((d) => ({ time: d.time as Time, value: d.value })));
      indicatorSeriesRefs.current.push(series);
    } else if (indicator === "ema20") {
      const emaData = calcEMA(ohlc, 20);
      const series = chartRef.current.addSeries(LineSeries, {
        color: "hsl(190, 95%, 60%)",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData(emaData.map((d) => ({ time: d.time as Time, value: d.value })));
      indicatorSeriesRefs.current.push(series);
    } else if (indicator === "bb") {
      const bb = calcBollingerBands(ohlc, 20, 2);
      const colors = ["hsl(258, 90%, 76%)", "hsl(48, 96%, 53%)", "hsl(258, 90%, 76%)"];
      [bb.upper, bb.middle, bb.lower].forEach((band, i) => {
        const series = chartRef.current!.addSeries(LineSeries, {
          color: colors[i],
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          lineStyle: i === 1 ? 0 : 2, // middle solid, bands dashed
        });
        series.setData(band.map((d) => ({ time: d.time as Time, value: d.value })));
        indicatorSeriesRefs.current.push(series);
      });
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [data, indicator]);

  // ─── Fullscreen toggle ───────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  return (
    <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col" : ""}`}>
      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* Interval tabs */}
        <div className="flex gap-0.5 glass rounded-lg p-0.5 text-[11px]">
          {INTERVALS.map((i) => (
            <button
              key={i.key}
              onClick={() => setInterval(i.key)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                interval === i.key
                  ? "bg-primary text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>

        {/* Indicator tabs */}
        <div className="flex gap-0.5 glass rounded-lg p-0.5 text-[11px]">
          {INDICATORS.map((ind) => (
            <button
              key={ind.key}
              onClick={() => setIndicator(ind.key)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                indicator === ind.key
                  ? "bg-secondary/80 text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="ml-auto glass rounded-lg p-1.5 hover:bg-primary/10 transition"
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Chart container */}
      <div className={`relative ${isFullscreen ? "flex-1" : "h-[400px]"}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading chart…
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full h-full rounded-lg overflow-hidden"
        />
      </div>
    </div>
  );
}
