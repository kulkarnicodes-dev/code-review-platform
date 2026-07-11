import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { reviewAPI } from '../services/api';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  violet:  '#7c6cff',
  emerald: '#34d399',
  amber:   '#fbbf24',
  rose:    '#f87171',
  sky:     '#38bdf8',
};

const LANG_META = {
  javascript: { emoji: '📜', color: '#f7df1e' },
  typescript: { emoji: '📘', color: '#3178c6' },
  python:     { emoji: '🐍', color: '#3776ab' },
  java:       { emoji: '☕', color: '#ed8b00' },
  cpp:        { emoji: '⚙️', color: '#00599c' },
  go:         { emoji: '🔷', color: '#00acd7' },
  rust:       { emoji: '🦀', color: '#ce422b' },
  ruby:       { emoji: '💎', color: '#cc342d' },
  swift:      { emoji: '🍎', color: '#f05138' },
  kotlin:     { emoji: '🎯', color: '#7f52ff' },
};
const getLang = (l) => LANG_META[l?.toLowerCase()] ?? { emoji: '💻', color: C.violet };

// ─── Score helpers ────────────────────────────────────────────────────────────
const scoreHex   = (s) => s >= 8 ? C.emerald   : s >= 6 ? C.amber   : C.rose;
const scoreCls   = (s) => s >= 8 ? 'text-emerald-400' : s >= 6 ? 'text-amber-400' : 'text-rose-400';
const scoreBarCls = (s) => s >= 8 ? 'bg-emerald-400'  : s >= 6 ? 'bg-amber-400'  : 'bg-rose-400';

// FIX: DAY_LABELS defined at module level (not inside component) to avoid stale closure
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Sparkline ────────────────────────────────────────────────────────────────
const Sparkline = ({ data = [], width = 120, height = 44, color = C.violet }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 10), min = 0;
  const pad = 4, w = width - pad * 2, h = height - pad * 2;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * w,
    pad + (1 - (v - min) / (max - min)) * h,
  ]);
  const d    = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${pad + h} L${pad},${pad + h} Z`;
  const gradId = `sg${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
};

// ─── Radar Chart ─────────────────────────────────────────────────────────────
const RadarChart = ({ metrics = [], size = 190 }) => {
  if (!metrics.length) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.35;
  const n = metrics.length;
  const angle  = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const toXY   = (val, i) => {
    const a = angle(i), ratio = Math.min(val / 10, 1);
    return [cx + r * ratio * Math.cos(a), cy + r * ratio * Math.sin(a)];
  };
  const outerXY = (i) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  const polyPts = metrics.map((m, i) => toXY(m.value, i).join(',')).join(' ');
  const avgVal  = metrics.reduce((s, m) => s + m.value, 0) / metrics.length;
  const color   = scoreHex(avgVal);

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Grid polygons */}
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon
          key={lvl}
          points={Array.from({ length: n }, (_, i) => {
            const [x, y] = outerXY(i);
            return `${(cx + (x - cx) * lvl).toFixed(1)},${(cy + (y - cy) * lvl).toFixed(1)}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {metrics.map((_, i) => {
        const [x, y] = outerXY(i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      {/* Data area */}
      <polygon points={polyPts} fill={`${color}25`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {metrics.map((m, i) => {
        const [x, y] = toXY(m.value, i);
        return <circle key={i} cx={x} cy={y} r="3.5" fill={scoreHex(m.value)} />;
      })}
      {/* Labels */}
      {metrics.map((m, i) => {
        const a = angle(i);
        const lx = cx + (r + 20) * Math.cos(a);
        const ly = cy + (r + 20) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="sans-serif">
            {m.label}
          </text>
        );
      })}
      {/* Center */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">
        {avgVal.toFixed(1)}
      </text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">avg</text>
    </svg>
  );
};

// ─── Bar Chart (FIX: use px height not %, framer-motion can't animate % height reliably without layout) ──
const BarChart = ({ data = [], height = 140 }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="relative" style={{ height }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <div key={pct} className="absolute left-0 right-0 border-t border-white/[0.04]"
          style={{ bottom: `${pct * 100}%` }} />
      ))}
      {/* Bars */}
      <div className="absolute inset-0 flex items-end gap-1 px-1 pb-5">
        {data.map((item, i) => {
          // FIX: compute pixel height instead of %, then animate via height in px
          const pxH = Math.max(((item.value / maxVal) * (height - 24)), 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative" style={{ height: '100%', justifyContent: 'flex-end' }}>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 left-1/2 -translate-x-1/2">
                <div className="bg-[#0c1018] border border-white/10 rounded-lg px-2 py-1 text-center whitespace-nowrap shadow-xl">
                  <p className="text-white text-xs font-bold">{item.value}</p>
                  <p className="text-gray-500 text-[10px]">{item.label}</p>
                </div>
              </div>
              <motion.div
                className="w-full rounded-t-sm"
                style={{ background: item.color ?? C.violet }}
                initial={{ height: 0 }}
                animate={{ height: pxH }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          );
        })}
      </div>
      {/* X labels */}
      <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-1">
        {data.map((item, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-[9px] text-gray-600 truncate">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Trend Line ───────────────────────────────────────────────────────────────
const TrendLine = ({ reviews = [], height = 160 }) => {
  const sorted = useMemo(
    () => [...reviews].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(-20),
    [reviews]
  );

  // FIX: guard for < 2 points
  if (sorted.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-600 text-sm" style={{ height }}>
        <div className="text-2xl mb-2 opacity-30">📈</div>
        <p>Need at least 2 reviews to show trend</p>
      </div>
    );
  }

  const scores = sorted.map((r) => r.scores?.overall_score ?? 0);
  // FIX: use a fixed viewBox coordinate system (0–100 x, 0–height y) for reliable rendering
  const VW = 100, VH = height;
  const padL = 8, padR = 4, padT = 8, padB = 24;
  const uw = VW - padL - padR, uh = VH - padT - padB;

  const pts = scores.map((s, i) => ({
    x: padL + (i / (scores.length - 1)) * uw,
    y: padT + (1 - s / 10) * uh,
    score: s,
    date: sorted[i].created_at,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(2)},${(padT + uh).toFixed(2)} L${padL},${(padT + uh).toFixed(2)} Z`;

  return (
    <div style={{ width: '100%', height }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" width="100%" height={height}>
        <defs>
          <linearGradient id="tlgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.violet} stopOpacity="0.25" />
            <stop offset="100%" stopColor={C.violet} stopOpacity="0"   />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 2, 4, 6, 8, 10].map((v) => {
          const y = padT + (1 - v / 10) * uh;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={padL + uw} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
              <text x={padL - 1} y={y} textAnchor="end" dominantBaseline="middle" fontSize="3" fill="rgba(255,255,255,0.2)">{v}</text>
            </g>
          );
        })}
        {/* Area */}
        <path d={areaPath} fill="url(#tlgrad)" />
        {/* Line — FIX: use CSS transition not framer pathLength on SVG (more reliable) */}
        <path d={linePath} fill="none" stroke={C.violet} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="1.2" fill={scoreHex(p.score)} />
            {(i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)) && (
              <text x={p.x} y={padT + uh + 7} textAnchor="middle" fontSize="2.8" fill="rgba(255,255,255,0.18)">
                {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── Donut Chart (FIX: correct strokeDashoffset accounting for full rotation) ─
const DonutChart = ({ segments = [], size = 130, thickness = 20 }) => {
  const total = segments.reduce((s, g) => s + g.value, 0);
  if (!total) return (
    <div className="flex items-center justify-center text-gray-600 text-xs" style={{ width: size, height: size }}>
      No issues
    </div>
  );

  const r    = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2, cy = size / 2;

  // FIX: Proper cumulative offset calculation
  // strokeDashoffset shifts the start of the dash pattern along the circle.
  // We start at -circ*0.25 (top = 12 o'clock) and subtract cumulative dash lengths.
  let cumulativeDash = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const startOffset = -(cumulativeDash) - circ * 0.25;
    cumulativeDash += dash;
    return { ...seg, dash, gap: circ - dash, offset: startOffset };
  });

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {arcs.map((arc, i) => (
        <motion.circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
          strokeDashoffset={arc.offset}
          strokeLinecap="butt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        />
      ))}
      {/* Center labels */}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="sans-serif">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7"  fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">issues</text>
    </svg>
  );
};

// ─── Stat Card (FIX: replaced dynamic Tailwind class strings with inline styles — Tailwind purges dynamic classes) ──
const ACCENT_STYLES = {
  violet:  { color: '#a78bfa', border: 'rgba(139,92,246,0.15)',  bg: 'rgba(139,92,246,0.04)'  },
  emerald: { color: '#34d399', border: 'rgba(52,211,153,0.15)',  bg: 'rgba(52,211,153,0.04)'  },
  amber:   { color: '#fbbf24', border: 'rgba(251,191,36,0.15)',  bg: 'rgba(251,191,36,0.04)'  },
  rose:    { color: '#f87171', border: 'rgba(248,113,113,0.15)', bg: 'rgba(248,113,113,0.04)' },
  sky:     { color: '#38bdf8', border: 'rgba(56,189,248,0.15)',  bg: 'rgba(56,189,248,0.04)'  },
};

const StatCard = ({ label, value, sub, accent = 'violet', icon, delay = 0 }) => {
  const a = ACCENT_STYLES[accent] ?? ACCENT_STYLES.violet;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ border: `1px solid ${a.border}`, background: a.bg }}
      className="rounded-2xl p-5 flex flex-col justify-between min-h-[110px]"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        {icon && <span className="text-lg opacity-40">{icon}</span>}
      </div>
      <div>
        <p className="text-4xl font-black tabular-nums" style={{ color: a.color }}>{value}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub }) => (
  <div className="mb-5">
    <h2 className="text-base font-bold text-white">{title}</h2>
    {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
  </div>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────
const Card = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`rounded-2xl border border-white/[0.06] bg-white/[0.018] p-5 ${className}`}
  >
    {children}
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [reviews,          setReviews]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [timeRange,        setTimeRange]        = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await reviewAPI.getReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered reviews ───────────────────────────────────────────────────────
  const filteredReviews = useMemo(() => {
    const now = new Date();
    let out = reviews;

    if (timeRange !== 'all') {
      const cut = new Date();
      if (timeRange === 'week')  cut.setDate(now.getDate() - 7);
      if (timeRange === 'month') cut.setMonth(now.getMonth() - 1);
      if (timeRange === 'year')  cut.setFullYear(now.getFullYear() - 1);
      out = out.filter((r) => new Date(r.created_at) >= cut);
    }
    if (selectedLanguage !== 'all') out = out.filter((r) => r.language === selectedLanguage);
    return out;
  }, [reviews, timeRange, selectedLanguage]);

  const languages = useMemo(() => [...new Set(reviews.map((r) => r.language))].sort(), [reviews]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!filteredReviews.length) return null;
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const scores = filteredReviews.map((r) => r.scores?.overall_score ?? 0);

    const sorted = [...filteredReviews].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const mid = Math.max(Math.floor(sorted.length / 2), 1);
    const imp = sorted.length > 1
      ? avg(sorted.slice(mid).map((r) => r.scores?.overall_score ?? 0)) -
        avg(sorted.slice(0, mid).map((r) => r.scores?.overall_score ?? 0))
      : 0;

    return {
      totalReviews:   filteredReviews.length,
      avgScore:       avg(scores).toFixed(1),
      maxScore:       Math.max(...scores),
      minScore:       Math.min(...scores),
      avgQuality:     avg(filteredReviews.map((r) => r.scores?.quality_score     ?? 0)).toFixed(1),
      avgReadability: avg(filteredReviews.map((r) => r.scores?.readability_score ?? 0)).toFixed(1),
      avgPerformance: avg(filteredReviews.map((r) => r.scores?.performance_score ?? 0)).toFixed(1),
      avgSecurity:    avg(filteredReviews.map((r) => r.scores?.security_score    ?? 0)).toFixed(1),
      totalBugs:      filteredReviews.reduce((s, r) => s + (r.ai_feedback?.bugs?.length        ?? 0), 0),
      totalPerf:      filteredReviews.reduce((s, r) => s + (r.ai_feedback?.performance?.length ?? 0), 0),
      totalSecurity:  filteredReviews.reduce((s, r) => s + (r.ai_feedback?.security?.length    ?? 0), 0),
      totalStyle:     filteredReviews.reduce((s, r) => s + (r.ai_feedback?.style?.length       ?? 0), 0),
      improvement:    imp.toFixed(1),
    };
  }, [filteredReviews]);

  // ── Language stats ─────────────────────────────────────────────────────────
  const languageStats = useMemo(() => {
    const counts = {};
    filteredReviews.forEach((r) => { counts[r.language] = (counts[r.language] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([lang, count]) => {
        const rs = filteredReviews.filter((r) => r.language === lang);
        const avgScore = rs.length
          ? (rs.reduce((s, r) => s + (r.scores?.overall_score ?? 0), 0) / rs.length).toFixed(1)
          : '0.0';
        return { lang, count, avgScore, meta: getLang(lang) };
      })
      .sort((a, b) => b.count - a.count);
  }, [filteredReviews]);

  // ── Trend data ─────────────────────────────────────────────────────────────
  const scoreTrend = useMemo(
    () => [...filteredReviews]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((r) => r.scores?.overall_score ?? 0),
    [filteredReviews]
  );

  // ── Heatmap (last 10 weeks) ────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const WEEKS = 10, DAYS = 7;
    return Array.from({ length: WEEKS }, (_, wi) =>
      Array.from({ length: DAYS }, (_, di) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (WEEKS - 1 - wi) * DAYS - (DAYS - 1 - di));
        const dayStr = date.toDateString();
        const dayReviews = reviews.filter((r) => new Date(r.created_at).toDateString() === dayStr);
        return {
          date,
          count: dayReviews.length,
          avg: dayReviews.length
            ? dayReviews.reduce((s, r) => s + (r.scores?.overall_score ?? 0), 0) / dayReviews.length
            : 0,
        };
      })
    );
  }, [reviews]);

  const totalIssues = stats
    ? stats.totalBugs + stats.totalPerf + stats.totalSecurity + stats.totalStyle
    : 0;

  // ── Loading / Error / Empty ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
      </div>
      <p className="text-gray-600 text-sm">Crunching your data…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-rose-400">Failed to Load</h2>
      <p className="text-gray-500 text-sm">{error}</p>
      <button onClick={fetchAnalytics} className="btn-primary mt-2">🔄 Retry</button>
    </div>
  );

  if (!reviews.length) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-5xl opacity-30">📊</div>
      <h2 className="text-xl font-bold text-white">No Analytics Yet</h2>
      <p className="text-gray-600 text-sm">Complete code reviews to see analytics</p>
      <a href="/review" className="btn-primary inline-block mt-2">🔍 Start Reviewing</a>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-display font-black text-gradient mb-1">Analytics</h1>
        <p className="text-gray-600 text-sm">Deep dive into your code review performance</p>
      </motion.div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
          {/* Time pills */}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
            {[
              { v: 'week',  l: '7 days'   },
              { v: 'month', l: '30 days'  },
              { v: 'year',  l: '1 year'   },
              { v: 'all',   l: 'All time' },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setTimeRange(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeRange === v
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Language select */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-all"
          >
            <option value="all">All Languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {getLang(l).emoji} {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-600 sm:ml-auto">
            {filteredReviews.length} of {reviews.length} reviews
          </p>
        </div>
      </motion.div>

      {/* ── No data in range ─────────────────────────────────────────────── */}
      {!stats && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📭</div>
          <p className="text-gray-500 text-sm">No reviews match the selected filters</p>
          <button
            onClick={() => { setTimeRange('all'); setSelectedLanguage('all'); }}
            className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
          >
            Reset filters
          </button>
        </div>
      )}

      {stats && (
        <>
          {/* ── Key stats ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Reviews"      value={stats.totalReviews}                     icon="📝" accent="violet"  delay={0.06} />
            <StatCard label="Avg Score"    value={stats.avgScore}  sub="out of 10"         icon="⭐" accent="emerald" delay={0.09} />
            <StatCard label="Best Score"   value={`${stats.maxScore}/10`}                  icon="🏆" accent="amber"   delay={0.12} />
            <StatCard label="Total Issues" value={totalIssues}                             icon="⚠️" accent="rose"    delay={0.15} />
          </div>

          {/* ── Trend + Radar ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2" delay={0.18}>
              <SectionHeader
                title="Score Trend"
                sub={`Last ${Math.min(filteredReviews.length, 20)} reviews · chronological`}
              />
              <TrendLine reviews={filteredReviews} height={160} />
            </Card>

            <Card delay={0.22} className="flex flex-col">
              <SectionHeader title="Metric Radar" sub="Average across all metrics" />
              <div className="flex-1 flex items-center justify-center py-2">
                <RadarChart
                  metrics={[
                    { label: 'Quality',  value: parseFloat(stats.avgQuality)     },
                    { label: 'Read.',    value: parseFloat(stats.avgReadability)  },
                    { label: 'Perf.',    value: parseFloat(stats.avgPerformance)  },
                    { label: 'Security', value: parseFloat(stats.avgSecurity)     },
                  ]}
                  size={190}
                />
              </div>
            </Card>
          </div>

          {/* ── Score breakdown + Donut ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card delay={0.26}>
              <SectionHeader title="Score Breakdown" sub="Average per metric" />
              <div className="space-y-4">
                {[
                  { label: 'Quality',     emoji: '✨', val: stats.avgQuality     },
                  { label: 'Readability', emoji: '📖', val: stats.avgReadability  },
                  { label: 'Performance', emoji: '⚡', val: stats.avgPerformance  },
                  { label: 'Security',    emoji: '🔒', val: stats.avgSecurity     },
                ].map(({ label, emoji, val }, i) => {
                  const v = parseFloat(val);
                  return (
                    <div key={label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-gray-400">{emoji} {label}</span>
                        <span className={`text-xs font-bold ${scoreCls(v)}`}>{val}/10</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div
                          className={`h-full rounded-full ${scoreBarCls(v)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${v * 10}%` }}
                          transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card delay={0.30}>
              <SectionHeader title="Issue Breakdown" sub="Across all filtered reviews" />
              <div className="flex items-center gap-6">
                <DonutChart
                  size={130}
                  thickness={20}
                  segments={[
                    { label: 'Bugs',        value: stats.totalBugs,    color: C.rose    },
                    { label: 'Performance', value: stats.totalPerf,    color: C.amber   },
                    { label: 'Security',    value: stats.totalSecurity, color: C.violet },
                    { label: 'Style',       value: stats.totalStyle,   color: C.sky     },
                  ].filter((s) => s.value > 0)}
                />
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Bugs',        val: stats.totalBugs,     hex: C.rose,    cls: 'text-rose-400'    },
                    { label: 'Performance', val: stats.totalPerf,     hex: C.amber,   cls: 'text-amber-400'   },
                    { label: 'Security',    val: stats.totalSecurity, hex: C.violet,  cls: 'text-violet-400'  },
                    { label: 'Style',       val: stats.totalStyle,    hex: C.sky,     cls: 'text-sky-400'     },
                  ].map(({ label, val, hex, cls }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: hex }} />
                        <span className="text-xs text-gray-500">{label}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-sm font-bold ${cls}`}>{val}</span>
                        <span className="text-[10px] text-gray-700">
                          ({filteredReviews.length ? (val / filteredReviews.length).toFixed(1) : '0'}/rev)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* ── Language distribution ─────────────────────────────────────── */}
          {languageStats.length > 0 && (
            <Card delay={0.34}>
              <SectionHeader title="Language Distribution" sub="Reviews and average scores by language" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <BarChart
                  height={140}
                  data={languageStats.map((l) => ({
                    label: `${l.meta.emoji} ${l.lang.slice(0, 5)}`,
                    value: l.count,
                    color: l.meta.color,
                  }))}
                />
                <div className="space-y-3">
                  {languageStats.map((l, i) => {
                    const pct = (l.count / filteredReviews.length) * 100;
                    return (
                      <div key={l.lang}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span>{l.meta.emoji}</span>
                            <span className="text-xs text-gray-300 capitalize font-medium">{l.lang}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-600">{l.count} rev</span>
                            <span className={`font-bold ${scoreCls(parseFloat(l.avgScore))}`}>{l.avgScore}/10</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: l.meta.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.38 + i * 0.06, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* ── Activity heatmap ──────────────────────────────────────────── */}
          <Card delay={0.38}>
            <SectionHeader title="Review Activity" sub="Last 10 weeks · hover a cell for details" />
            <div className="overflow-x-auto">
              <div style={{ minWidth: 340 }}>
                {/* Column day labels */}
                <div className="flex gap-1 mb-1" style={{ marginLeft: 28 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} className="text-center text-[9px] text-gray-700" style={{ width: 20 }}>{d[0]}</div>
                  ))}
                </div>
                {/* Rows = weeks */}
                <div className="space-y-1">
                  {heatmapData.map((week, wi) => (
                    <div key={wi} className="flex items-center gap-1">
                      {/* Week label */}
                      <div className="text-[8px] text-gray-700 text-right" style={{ width: 24 }}>
                        {wi % 3 === 0
                          ? new Date(week[0].date).toLocaleDateString('en-US', { month: 'short' })
                          : ''}
                      </div>
                      {week.map((cell, di) => {
                        const intensity = cell.count > 0 ? Math.min(cell.count / 3, 1) : 0;
                        const bg = cell.count === 0
                          ? 'rgba(255,255,255,0.04)'
                          : `rgba(124,108,255,${(0.2 + intensity * 0.8).toFixed(2)})`;
                        return (
                          <div key={di} className="relative group">
                            <div
                              className="rounded-sm transition-transform hover:scale-125 cursor-default"
                              style={{ width: 20, height: 20, background: bg }}
                            />
                            {cell.count > 0 && (
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                                <div className="bg-[#0c1018] border border-white/10 rounded-lg px-2 py-1.5 text-center shadow-xl">
                                  <p className="text-white text-xs font-bold">{cell.count} review{cell.count !== 1 ? 's' : ''}</p>
                                  <p className="text-gray-500 text-[10px]">
                                    {cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                  {cell.avg > 0 && (
                                    <p className={`text-[10px] font-semibold ${scoreCls(cell.avg)}`}>
                                      avg {cell.avg.toFixed(1)}/10
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2 mt-3" style={{ marginLeft: 28 }}>
                  <span className="text-[9px] text-gray-700">Less</span>
                  {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                    <div
                      key={v}
                      className="rounded-sm"
                      style={{
                        width: 14, height: 14,
                        background: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(124,108,255,${(0.2 + v * 0.8).toFixed(2)})`,
                      }}
                    />
                  ))}
                  <span className="text-[9px] text-gray-700">More</span>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Improvement banner ────────────────────────────────────────── */}
          {parseFloat(stats.improvement) !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              style={{
                border: `1px solid ${parseFloat(stats.improvement) > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                background: parseFloat(stats.improvement) > 0 ? 'rgba(52,211,153,0.04)' : 'rgba(248,113,113,0.04)',
              }}
              className="rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{parseFloat(stats.improvement) > 0 ? '📈' : '📉'}</div>
                  <div>
                    <h3 className="font-bold text-white mb-0.5">
                      {parseFloat(stats.improvement) > 0 ? 'Great Progress!' : 'Keep Practicing'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Your score has{' '}
                      <span
                        className="font-bold"
                        style={{ color: parseFloat(stats.improvement) > 0 ? C.emerald : C.rose }}
                      >
                        {parseFloat(stats.improvement) > 0 ? '+' : ''}{stats.improvement} pts
                      </span>{' '}
                      comparing your first vs recent reviews
                    </p>
                  </div>
                </div>
                <Sparkline
                  data={scoreTrend}
                  width={140}
                  height={48}
                  color={parseFloat(stats.improvement) > 0 ? C.emerald : C.rose}
                />
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;