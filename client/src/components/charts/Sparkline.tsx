import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export const Sparkline = ({ data, color = "hsl(var(--primary))", height = 40 }: { data: number[]; color?: string; height?: number }) => {
  const validData = useMemo(() => (data || []).filter((v) => typeof v === "number" && Number.isFinite(v)), [data]);

  const { points, domain } = useMemo(() => {
    if (validData.length === 0) return { points: [], domain: [0, 1] as [number, number] };
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    const domainTuple: [number, number] =
      !Number.isFinite(min) || !Number.isFinite(max)
        ? [0, 1]
        : min === max
        ? [min * 0.95, max * 1.05 || 1]
        : [min, max];
    return {
      points: validData.map((v, i) => ({ i, v })),
      domain: domainTuple,
    };
  }, [validData]);

  if (points.length === 0) {
    return <div style={{ height }} className="w-full opacity-20" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points}>
        <YAxis hide domain={domain} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};
