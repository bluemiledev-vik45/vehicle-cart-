import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import styles from './AnalogChart.module.css';

interface AnalogChartProps {
  id: string;
  name: string;
  unit: string;
  color: string;
  data: Array<{ time: Date; value: number }>;
  yAxisRange: { min: number; max: number };
  selectedTime: Date | null;
  crosshairActive: boolean;
  timeDomain: [number, number] | null;
  perSecondStats?: { avg: number[]; min: number[]; max: number[] } | null;
}

const AnalogChart: React.FC<AnalogChartProps> = ({
  id,
  name,
  unit,
  color,
  data,
  yAxisRange,
  selectedTime,
  crosshairActive,
  timeDomain,
  perSecondStats,
}) => {
  const chartData = useMemo(() => {
    // Convert data points to chart format using EXACT API values (no decimation, no smoothing)
    const toPoint = (d: any) => {
      const avg = d.avg ?? d.value;
      const min = d.min ?? d.value;
      const max = d.max ?? d.value;
      return { 
        time: d.time.getTime(), 
        avg: Number(avg), 
        min: Number.isFinite(Number(min)) ? Number(min) : avg, 
        max: Number.isFinite(Number(max)) ? Number(max) : avg 
      };
    };

    // Filter to visible domain with small padding to avoid gaps at edges
    const PAD = 5 * 60 * 1000; // 5 min pad
    const filtered = (() => {
      if (!timeDomain) return data.map(toPoint);
      const [start, end] = timeDomain;
      const lo = start - PAD;
      const hi = end + PAD;
      return data
        .filter((d: any) => {
          const t = d.time.getTime();
          return t >= lo && t <= hi;
        })
        .map(toPoint);
    })();

    // Use ALL data points - no decimation, no bucketing, no averaging
    // This ensures exact API values are displayed
    return filtered.map(p => ({
      time: p.time,
      avg: p.avg,
      min: p.min,
      max: p.max,
      deltaTop: p.max - p.avg,
      deltaBottom: -(p.avg - p.min)
    }));
  }, [data, timeDomain]);

  // Build a per-second lookup map from the original data to preserve exact second stats
  const perSecondMap = useMemo(() => {
    const map = new Map<string, { avg: number; min: number; max: number }>();
    (data as any[]).forEach((d: any) => {
      const key = (d.hms as string) || format(d.time, 'HH:mm:ss');
      const avg = Number(d.rawAvg ?? d.avg ?? d.value);
      const minSource = d.rawMin ?? d.min ?? d.value;
      const maxSource = d.rawMax ?? d.max ?? d.value;
      const min = Number(minSource);
      const max = Number(maxSource);
      if (key && Number.isFinite(avg)) {
        map.set(key, {
          avg,
          min: Number.isFinite(min) ? min : avg,
          max: Number.isFinite(max) ? max : avg,
        });
      }
    });
    return map;
  }, [data]);

  const formatTime = (tick: number) => {
    return format(new Date(tick), 'HH:mm');
  };

  const formatYAxisLabel = (value: number) => {
    return `${value} ${unit}`;
  };

  const getPointAtTime = (time: Date | null): { time: number; avg: number; min: number; max: number } | null => {
    if (!time || chartData.length === 0) return null;
    const timestamp = time.getTime();

    // Prefer exact per-second values when available from original data
    if (perSecondMap.size > 0) {
      const key = format(time, 'HH:mm:ss');
      const hit = perSecondMap.get(key);
      if (hit) {
        const avg = Number.isFinite(hit.avg) && !isNaN(hit.avg) ? hit.avg : 0;
        const min = Number.isFinite(hit.min) && !isNaN(hit.min) ? hit.min : avg;
        const max = Number.isFinite(hit.max) && !isNaN(hit.max) ? hit.max : avg;
        return { time: time.getTime(), avg, min, max };
      }
    }

    let closest = chartData[0];
    let minDiff = Math.abs(closest.time - timestamp);

    for (const point of chartData) {
      const diff = Math.abs(point.time - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point as any;
      }
    }

    const step = chartData.length > 1 ? Math.abs(chartData[1].time - chartData[0].time) : 0;
    const tolerance = Math.max(60 * 1000, step > 0 ? Math.floor(step / 2) : 0);
    if (minDiff > tolerance) return null;
    const c: any = closest;
    const avg: number = Number(c.avg);
    const min: number = Number.isFinite(Number(c.min)) && !isNaN(Number(c.min)) ? Number(c.min) : (Number.isFinite(avg) && !isNaN(avg) ? avg : 0);
    const max: number = Number.isFinite(Number(c.max)) && !isNaN(Number(c.max)) ? Number(c.max) : (Number.isFinite(avg) && !isNaN(avg) ? avg : 0);
    
    // Final validation
    const finalAvg = Number.isFinite(avg) && !isNaN(avg) ? avg : 0;
    const finalMin = Number.isFinite(min) && !isNaN(min) ? min : finalAvg;
    const finalMax = Number.isFinite(max) && !isNaN(max) ? max : finalAvg;
    
    return { time: c.time, avg: finalAvg, min: finalMin, max: finalMax };
  };

  // Hover tooltip removed per requirement

  const visibleStats = useMemo(() => {
    // Compute stats from original data (per-minute) not decimated chartData
    // This ensures accurate Min/Max/Avg values from actual API data
    const getValue = (d: any): { avg: number; min: number; max: number } | null => {
      // Handle string values from API (e.g., "102" -> 102)
      const avgRaw = d.avg ?? d.value;
      const minRaw = d.min;
      const maxRaw = d.max;
      
      const avg = Number(avgRaw);
      const min = minRaw != null ? Number(minRaw) : avg;
      const max = maxRaw != null ? Number(maxRaw) : avg;
      
      // Return null if avg is invalid (will filter out)
      if (!Number.isFinite(avg) || isNaN(avg)) {
        return null;
      }
      
      return {
        avg,
        min: Number.isFinite(min) && !isNaN(min) ? min : avg,
        max: Number.isFinite(max) && !isNaN(max) ? max : avg,
      };
    };

    let filtered = data;
    if (timeDomain) {
      filtered = data.filter((d: any) => {
        const t = d.time.getTime();
        return t >= timeDomain[0] && t <= timeDomain[1];
      });
    }

    if (!filtered.length) {
      // Fallback to all data
      filtered = data;
    }

    if (!filtered.length) return { avg: 0, min: 0, max: 0 };

    // Collect all avg, min, max values from actual data points - filter out invalid
    const allAvgs: number[] = [];
    const allMins: number[] = [];
    const allMaxs: number[] = [];

    filtered.forEach((d: any) => {
      const vals = getValue(d);
      if (vals) {
        if (Number.isFinite(vals.avg) && !isNaN(vals.avg)) allAvgs.push(vals.avg);
        if (Number.isFinite(vals.min) && !isNaN(vals.min)) allMins.push(vals.min);
        if (Number.isFinite(vals.max) && !isNaN(vals.max)) allMaxs.push(vals.max);
      }
    });

    if (allAvgs.length === 0) return { avg: 0, min: 0, max: 0 };

    const avg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
    const min = allMins.length > 0 ? Math.min(...allMins) : (allAvgs.length > 0 ? Math.min(...allAvgs) : 0);
    const max = allMaxs.length > 0 ? Math.max(...allMaxs) : (allAvgs.length > 0 ? Math.max(...allAvgs) : 0);

    // Final validation to prevent NaN
    return {
      avg: Number.isFinite(avg) && !isNaN(avg) ? avg : 0,
      min: Number.isFinite(min) && !isNaN(min) ? min : 0,
      max: Number.isFinite(max) && !isNaN(max) ? max : 0,
    };
  }, [data, timeDomain]);

  const xDomain = useMemo(() => {
    if (!chartData.length) return ['dataMin', 'dataMax'] as const;
    const dataMin = chartData[0].time;
    const dataMax = chartData[chartData.length - 1].time;
    if (!timeDomain) return ['dataMin', 'dataMax'] as const;
    const hasAny = chartData.some(d => d.time >= timeDomain[0] && d.time <= timeDomain[1]);
    return hasAny ? (timeDomain as [number, number]) : ([dataMin, dataMax] as [number, number]);
  }, [chartData, timeDomain]);

  // Uniform ticks every 10 minutes to match scrubber
  const ticks = useMemo(() => {
    if (!timeDomain) return undefined;
    const [start, end] = timeDomain;
    const step = 10 * 60 * 1000;
    const alignedStart = Math.floor(start / step) * step;
    const arr: number[] = [];
    for (let t = alignedStart; t <= end; t += step) arr.push(t);
    return arr;
  }, [timeDomain]);

  const selectedPoint = getPointAtTime(selectedTime);
  const displayStats = selectedPoint
    ? { avg: selectedPoint.avg, min: selectedPoint.min, max: selectedPoint.max }
    : visibleStats;

  return (
    <div className={styles.container}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>
          {name} ({id})
        </div>
        <div className={styles.chartSummary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Avg</span>
            <span className={styles.summaryValue}>
              {displayStats.avg.toFixed(1)} {unit}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Min</span>
            <span className={styles.summaryValue}>
              {displayStats.min.toFixed(1)} {unit}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Max</span>
            <span className={styles.summaryValue}>
              {displayStats.max.toFixed(1)} {unit}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 20, bottom: 40 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={xDomain as any}
              ticks={ticks as any}
              tickFormatter={formatTime}
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 9 }}
            />
            <YAxis
              domain={[yAxisRange.min, yAxisRange.max] as [number, number]}
              allowDataOverflow={true}
              allowDecimals={true}
              type="number"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              width={140}
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            {/* Tooltip removed */}
            {/* Show only avg line; min/max colored areas removed per request */}
            {/* type="linear" instead of "monotone" to disable smoothing and show exact values */}
            <Line type="linear" dataKey="avg" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} isAnimationActive={false} connectNulls={false} />
            {crosshairActive && selectedTime && (
              <ReferenceLine
                x={selectedTime.getTime()}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* Per-time stats footer removed */}
    </div>
  );
};

export default AnalogChart;
