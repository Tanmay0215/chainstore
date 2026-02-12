type StatsCardProps = {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  color?: "cyan" | "emerald" | "rose" | "amber" | "indigo";
};

export default function StatsCard({
  label,
  value,
  trend,
  color = "cyan",
}: StatsCardProps) {
  const colorClasses = {
    cyan: "border-cyan-200/20 bg-cyan-500/5 text-cyan-200",
    emerald: "border-emerald-200/20 bg-emerald-500/5 text-emerald-200",
    rose: "border-rose-200/20 bg-rose-500/5 text-rose-200",
    amber: "border-amber-200/20 bg-amber-500/5 text-amber-200",
    indigo: "border-indigo-200/20 bg-indigo-500/5 text-indigo-200",
  };

  return (
    <div className={`rounded-2xl border p-5 ${colorClasses[color]}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {trend && (
        <p
          className={`mt-2 text-xs ${
            trend.direction === "up" ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
        </p>
      )}
    </div>
  );
}
