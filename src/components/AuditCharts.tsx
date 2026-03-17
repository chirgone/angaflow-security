/**
 * AuditCharts.tsx — Enterprise-grade SVG chart components for Anga Security audit reports.
 * All charts use inline SVG for zero-dependency rendering with dark theme support.
 */
import { useState } from 'react';

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0f172a',
  card: '#111827',
  border: '#1e293b',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

const CHART_PALETTE = [COLORS.cyan, COLORS.blue, COLORS.green, COLORS.yellow, COLORS.orange, COLORS.red, COLORS.purple, COLORS.pink];

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB';
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

// ─── Circular Progress Ring (Datadog/Grafana style) ──────────────────────────
interface SpeedometerProps {
  score: number;
  grade: string;
  size?: number;
  label?: string;
}

export function Speedometer({ score, grade, size = 220, label }: SpeedometerProps) {
  const cx = size / 2;
  const cy = size / 2;
  const ringWidth = size * 0.09;
  const r = (size - ringWidth) / 2 - 8;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const dashOffset = circumference * (1 - progress);

  const getColor = (s: number) =>
    s >= 90 ? COLORS.green : s >= 75 ? COLORS.cyan : s >= 60 ? COLORS.yellow : s >= 40 ? COLORS.orange : COLORS.red;
  const scoreColor = getColor(score);

  // Gradient stops: always red → orange → yellow → cyan → green
  const gradId = `ring-grad-${size}`;
  const glowId = `ring-glow-${size}`;
  const bgGlowId = `ring-bg-glow-${size}`;

  // Outer tick marks for enterprise feel (every 10%)
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        {/* Gradient for the progress arc */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={score < 40 ? COLORS.red : score < 60 ? COLORS.orange : COLORS.cyan} />
          <stop offset="100%" stopColor={scoreColor} />
        </linearGradient>
        {/* Glow filter for progress */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Subtle inner shadow */}
        <filter id={bgGlowId} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Outer subtle ring for depth */}
      <circle cx={cx} cy={cy} r={r + ringWidth / 2 + 3} fill="none" stroke="#1e293b" strokeWidth={1} opacity={0.5} />

      {/* Tick marks around outer edge */}
      {ticks.map((tick) => {
        const angle = ((tick / 100) * 360 - 90) * (Math.PI / 180);
        const outerR = r + ringWidth / 2 + 2;
        const innerR = r + ringWidth / 2 - 3;
        const x1 = cx + outerR * Math.cos(angle);
        const y1 = cy + outerR * Math.sin(angle);
        const x2 = cx + innerR * Math.cos(angle);
        const y2 = cy + innerR * Math.sin(angle);
        return (
          <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth={tick % 50 === 0 ? 2 : 1} opacity={tick % 50 === 0 ? 0.6 : 0.3} />
        );
      })}

      {/* Background track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth={ringWidth}
        strokeLinecap="round"
      />

      {/* Faint color zones in background */}
      {[
        { pct: 0.40, color: COLORS.red },
        { pct: 0.20, color: COLORS.orange },
        { pct: 0.15, color: COLORS.yellow },
        { pct: 0.15, color: COLORS.cyan },
        { pct: 0.10, color: COLORS.green },
      ].reduce<{ offset: number; elems: any[] }>((acc, zone, i) => {
        const segLen = circumference * zone.pct;
        acc.elems.push(
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={zone.color}
            strokeWidth={ringWidth * 0.35}
            strokeDasharray={`${segLen} ${circumference - segLen}`}
            strokeDashoffset={-acc.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={0.08}
          />
        );
        acc.offset += segLen;
        return acc;
      }, { offset: 0, elems: [] }).elems}

      {/* Progress arc with gradient */}
      {score > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={ringWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          filter={`url(#${glowId})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      )}

      {/* End-cap dot at score position */}
      {score > 2 && (() => {
        const angle = ((score / 100) * 360 - 90) * (Math.PI / 180);
        const dotX = cx + r * Math.cos(angle);
        const dotY = cy + r * Math.sin(angle);
        return (
          <>
            <circle cx={dotX} cy={dotY} r={ringWidth * 0.4} fill={scoreColor} opacity={0.3} />
            <circle cx={dotX} cy={dotY} r={ringWidth * 0.2} fill={scoreColor} />
          </>
        );
      })()}

      {/* Center: Score number */}
      <text x={cx} y={cy - size * 0.04} textAnchor="middle" dominantBaseline="middle" fill={scoreColor} fontSize={size * 0.22} fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-1">
        {score}
      </text>

      {/* Center: Grade letter */}
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" dominantBaseline="middle" fill={scoreColor} fontSize={size * 0.09} fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" opacity={0.85} letterSpacing="2">
        GRADE {grade}
      </text>

      {/* Center: /100 subtitle */}
      <text x={cx} y={cy + size * 0.22} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize={size * 0.05} fontFamily="monospace">
        / 100
      </text>

      {/* Label below */}
      {label && (
        <text x={cx} y={cy + size * 0.32} textAnchor="middle" fill="#94a3b8" fontSize={size * 0.045} fontFamily="system-ui">
          {label}
        </text>
      )}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  /** Optional click handler per slice index */
  onSliceClick?: (index: number, slice: DonutSlice) => void;
}

export function DonutChart({ slices, size = 180, centerLabel, centerValue, onSliceClick }: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const strokeW = size * 0.12;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let cumAngle = -90;
  const paths = slices.map((slice, i) => {
    const angle = (slice.value / total) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + angle) * Math.PI) / 180;
    cumAngle += angle;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    const isHovered = hovered === i;
    return (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={slice.color}
        strokeWidth={isHovered ? strokeW * 1.3 : strokeW}
        strokeLinecap="butt"
        opacity={hovered !== null && !isHovered ? 0.4 : 1}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSliceClick?.(i, slice)}
        style={{ cursor: onSliceClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
      />
    );
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        {centerValue && (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle" fill={COLORS.textPrimary} fontSize={size * 0.11} fontWeight="700" fontFamily="system-ui">
              {centerValue}
            </text>
            {centerLabel && (
              <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" fill={COLORS.textMuted} fontSize={size * 0.055} fontFamily="system-ui">
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        {slices.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: hovered === i ? s.color : COLORS.textSecondary, cursor: onSliceClick ? 'pointer' : 'default' }}
            onClick={() => onSliceClick?.(i, s)}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="font-mono font-medium" style={{ color: s.color }}>{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini Bar Chart (Time Series) ─────────────────────────────────────────────
interface TimeSeriesPoint { timestamp: string; count: number }

interface AreaChartProps {
  series: { label: string; data: TimeSeriesPoint[]; color: string }[];
  height?: number;
  lang: 'es' | 'en';
}

export function StackedBarChart({ series, height = 200, lang }: AreaChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  if (!series.length || !series[0].data.length) return null;

  // Aggregate hourly data into daily buckets
  const dailyMap = new Map<string, Record<string, number>>();
  series.forEach((s) => {
    s.data.forEach((pt) => {
      const day = pt.timestamp.slice(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, {});
      const bucket = dailyMap.get(day)!;
      bucket[s.label] = (bucket[s.label] || 0) + pt.count;
    });
  });

  const days = Array.from(dailyMap.keys()).sort();
  const maxTotal = Math.max(...days.map((d) => {
    const bucket = dailyMap.get(d)!;
    return Object.values(bucket).reduce((a, b) => a + b, 0);
  }));

  const w = 800;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = w - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = Math.max(2, (chartW / days.length) - 2);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxTotal * f));

  return (
    <div className="relative w-full" style={{ minHeight: height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = padding.top + chartH - (tick / maxTotal) * chartH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#1e293b" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="monospace">
                {formatNumber(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {days.map((day, di) => {
          const bucket = dailyMap.get(day)!;
          const x = padding.left + (di / days.length) * chartW + 1;
          let yOffset = 0;

          return (
            <g key={day}
              onMouseEnter={(e) => {
                const total = Object.values(bucket).reduce((a, b) => a + b, 0);
                const dateStr = new Date(day).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' });
                const details = series.map((s) => `${s.label}: ${formatNumber(bucket[s.label] || 0)}`).join('\n');
                setTooltip({ x: e.clientX, y: e.clientY, content: `${dateStr}\nTotal: ${formatNumber(total)}\n${details}` });
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'crosshair' }}
            >
              {series.map((s, si) => {
                const val = bucket[s.label] || 0;
                const barH = (val / maxTotal) * chartH;
                const y = padding.top + chartH - yOffset - barH;
                yOffset += barH;
                return <rect key={si} x={x} y={y} width={barW} height={Math.max(0, barH)} fill={s.color} rx={1} opacity={0.85} />;
              })}
            </g>
          );
        })}

        {/* X-axis labels (every 2nd day) */}
        {days.filter((_, i) => i % 2 === 0).map((day, i) => {
          const di = days.indexOf(day);
          const x = padding.left + (di / days.length) * chartW + barW / 2;
          const dateStr = new Date(day).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' });
          return (
            <text key={i} x={x} y={height - 8} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">
              {dateStr}
            </text>
          );
        })}
      </svg>

      {/* Legend below chart */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 justify-center">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.textSecondary }}>
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ���── Horizontal Bar Chart ─────────────────────────────────────────────────────
interface HBarItem {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}

interface HBarChartProps {
  items: HBarItem[];
  maxItems?: number;
  formatValue?: (v: number) => string;
}

export function HorizontalBarChart({ items, maxItems = 10, formatValue = formatNumber }: HBarChartProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const max = sorted[0]?.value || 1;

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const pct = (item.value / max) * 100;
        const color = item.color || CHART_PALETTE[i % CHART_PALETTE.length];
        return (
          <div key={i}>
            <div className="flex justify-between items-baseline mb-0.5">
              <span className="text-xs font-mono truncate max-w-[60%]" style={{ color: COLORS.textPrimary }}>{item.label}</span>
              <div className="flex items-baseline gap-2">
                {item.sublabel && <span className="text-xs" style={{ color: COLORS.textMuted }}>{item.sublabel}</span>}
                <span className="text-xs font-mono font-medium" style={{ color }}>{formatValue(item.value)}</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.8 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bot Score Histogram ──────────────────────────────────────────────────────
interface HistogramItem { score: number; count: number }

interface HistogramProps {
  data: HistogramItem[];
  height?: number;
  lang: 'es' | 'en';
}

export function BotScoreHistogram({ data, height = 160, lang }: HistogramProps) {
  if (!data.length) return null;

  // Group into ranges of 10
  const ranges = Array.from({ length: 10 }, (_, i) => {
    const lo = i * 10 + 1;
    const hi = (i + 1) * 10;
    const total = data.filter((d) => d.score >= lo && d.score <= hi).reduce((sum, d) => sum + d.count, 0);
    return { label: `${lo}-${hi}`, total, lo, hi };
  });

  const max = Math.max(...ranges.map((r) => r.total));
  const w = 500;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartW = w - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = chartW / ranges.length - 4;

  const getColor = (lo: number) => {
    if (lo <= 10) return COLORS.red;
    if (lo <= 30) return COLORS.orange;
    if (lo <= 50) return COLORS.yellow;
    if (lo <= 70) return COLORS.cyan;
    return COLORS.green;
  };

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet">
        {ranges.map((range, i) => {
          const barH = (range.total / max) * chartH;
          const x = padding.left + i * (chartW / ranges.length) + 2;
          const y = padding.top + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={getColor(range.lo)} rx={2} opacity={0.8} />
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="monospace">
                {range.label}
              </text>
              {range.total > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#94a3b8" fontSize={8} fontFamily="monospace">
                  {formatNumber(range.total)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs px-2 mt-1" style={{ color: COLORS.textMuted }}>
        <span>{lang === 'es' ? 'Mas bot' : 'More bot'} ←</span>
        <span>→ {lang === 'es' ? 'Mas humano' : 'More human'}</span>
      </div>
    </div>
  );
}

// ─── Status Code Distribution ─────────────────────────────────────────────────
interface StatusCodesProps {
  codes: Record<string, number>;
}

export function StatusCodeChart({ codes }: StatusCodesProps) {
  const entries = Object.entries(codes).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  const getStatusColor = (code: string) => {
    const n = parseInt(code);
    if (n < 300) return COLORS.green;
    if (n < 400) return COLORS.cyan;
    if (n < 500) return COLORS.yellow;
    return COLORS.red;
  };

  return (
    <div className="space-y-1.5">
      {entries.slice(0, 8).map(([code, count]) => {
        const pct = (count / total) * 100;
        const color = getStatusColor(code);
        return (
          <div key={code} className="flex items-center gap-2">
            <span className="w-10 text-xs font-mono font-bold" style={{ color }}>{code}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.max(1, pct)}%`, background: color, opacity: 0.7 }} />
            </div>
            <span className="w-16 text-right text-xs font-mono" style={{ color: COLORS.textSecondary }}>{formatNumber(count)}</span>
            <span className="w-12 text-right text-xs font-mono" style={{ color: COLORS.textMuted }}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({ label, value, sublabel, icon, color = COLORS.cyan }: MetricCardProps) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: `0 2px 10px ${color}08` }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.textSecondary }}>{label}</span>
        </div>
        <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
        {sublabel && <p className="text-xs mt-1.5 font-medium" style={{ color: COLORS.textMuted }}>{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  badgeColor?: string;
}

export function SectionHeader({ title, subtitle, icon, badge, badgeColor = COLORS.cyan }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5 pb-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: `${badgeColor}15`, border: `1px solid ${badgeColor}30` }}>
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold tracking-tight" style={{ color: COLORS.textPrimary }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: badgeColor + '15', color: badgeColor, border: `1px solid ${badgeColor}30` }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export { formatNumber, formatBytes, COLORS, CHART_PALETTE };
