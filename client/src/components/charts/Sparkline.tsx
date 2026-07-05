import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export const Sparkline = ({ data, color = "hsl(var(--primary))", height = 40 }: { data: number[]; color?: string; height?: number }) => {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};
