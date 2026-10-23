import { useId } from 'react';

// Lightweight bar chart built with SVG — no external dependencies.
// Each bar represents hours studied on a given day.

interface BarChartProps {
  data: { label: string; hours: number }[];
  maxHours?: number;
  accent?: string;
}

export function BarChart({ data, maxHours, accent = '#6366f1' }: BarChartProps) {
  const max = maxHours ?? Math.max(...data.map((d) => d.hours), 1);
  const chartHeight = 160;

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height: chartHeight }}>
        {data.map((d, i) => {
          const h = max > 0 ? (d.hours / max) * (chartHeight - 24) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
              <div className="relative w-full flex justify-center">
                <div
                  className="absolute -top-6 text-xs font-semibold text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-0.5 rounded shadow-soft whitespace-nowrap"
                >
                  {d.hours.toFixed(1)}h
                </div>
                <div
                  className="w-full max-w-[36px] rounded-t-lg transition-all duration-500 ease-out group-hover:opacity-90"
                  style={{
                    height: `${Math.max(h, 2)}px`,
                    background: d.hours > 0
                      ? `linear-gradient(to top, ${accent}, ${accent}cc)`
                      : '#f1f5f9',
                  }}
                />
              </div>
              <span className="text-[11px] font-medium text-ink-500 mt-1">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Donut chart for subject-wise completion
interface DonutProps {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ segments, centerLabel, centerValue }: DonutProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = 60;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const gid = useId();

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative" style={{ width: (radius + stroke) * 2, height: (radius + stroke) * 2 }}>
        <svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} viewBox={`0 0 ${(radius + stroke) * 2} ${(radius + stroke) * 2}`}>
          <g transform={`rotate(-90 ${(radius + stroke) / 2} ${(radius + stroke) / 2})`}>
            <circle
              cx={(radius + stroke) / 2}
              cy={(radius + stroke) / 2}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={stroke}
            />
            {total > 0 &&
              segments.map((seg, i) => {
                const frac = seg.value / total;
                const len = frac * circumference;
                const dash = `${len} ${circumference - len}`;
                const el = (
                  <circle
                    key={`${gid}-${i}`}
                    cx={(radius + stroke) / 2}
                    cy={(radius + stroke) / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={stroke}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                );
                offset += len;
                return el;
              })}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-bold text-ink-900">{centerValue ?? total}</span>
          {centerLabel && <span className="text-xs text-ink-400 font-medium">{centerLabel}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
            <span className="text-ink-600 font-medium">{seg.label}</span>
            <span className="text-ink-400 ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Linear progress bar
export function ProgressBar({
  value,
  max = 100,
  color = '#6366f1',
  className = '',
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`w-full bg-ink-100 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
