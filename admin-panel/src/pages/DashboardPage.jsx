import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart
} from 'recharts'

/* ─── Design Tokens (shared with AnalyticsPage) ─────────────────────── */
const T = {
  bg:       '#090d14',
  surface:  '#0d1420',
  elevated: '#111c2e',
  border:   '#1a2640',
  borderHi: '#2a3f60',
  text:     '#e8f0fe',
  muted:    '#4d6380',
  dim:      '#2d4060',
  cyan:     '#00e5ff',
  violet:   '#a855f7',
  green:    '#22d3a0',
  amber:    '#f59e0b',
  red:      '#f43f5e',
  pink:     '#ec4899',
  indigo:   '#6366f1',
  lime:     '#84cc16',
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  .dp-root {
    --font-head: 'Syne', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    background: ${T.bg};
    color: ${T.text};
    font-family: var(--font-head);
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dp-root .anim { opacity: 0; animation: fadeUp .45s ease forwards; }
  .dp-root .a1 { animation-delay: .04s; }
  .dp-root .a2 { animation-delay: .10s; }
  .dp-root .a3 { animation-delay: .17s; }
  .dp-root .a4 { animation-delay: .24s; }
  .dp-root .a5 { animation-delay: .31s; }

  /* ── Header ── */
  .dp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 36px;
  }
  .dp-eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: ${T.cyan};
    margin-bottom: 6px;
  }
  .dp-title {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -.02em;
    line-height: 1;
    color: ${T.text};
  }
  .dp-subtitle {
    margin-top: 6px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: ${T.muted};
  }
  .dp-health-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--pill-border);
    background: var(--pill-bg);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--pill-color);
    transition: all .2s;
  }
  .dp-health-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--pill-color);
    box-shadow: 0 0 6px var(--pill-color);
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .4; }
  }
  .dp-health-dot.pulse { animation: pulse 2s infinite; }

  /* ── KPI row ── */
  .dp-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) { .dp-kpi-row { grid-template-columns: repeat(2,1fr); } }

  .dp-kpi {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 14px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
    cursor: default;
    transition: border-color .2s, transform .2s;
  }
  .dp-kpi:hover { border-color: ${T.borderHi}; transform: translateY(-2px); }
  .dp-kpi::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--kc);
    opacity: .75;
  }
  .dp-kpi-glow {
    position: absolute;
    top: -30px; right: -30px;
    width: 90px; height: 90px;
    border-radius: 50%;
    background: var(--kc);
    opacity: .05;
    pointer-events: none;
  }
  .dp-kpi-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: ${T.muted};
    margin-bottom: 10px;
  }
  .dp-kpi-value {
    font-family: var(--font-mono);
    font-size: 30px;
    font-weight: 700;
    color: var(--kc);
    line-height: 1;
    letter-spacing: -.02em;
  }
  .dp-kpi-sub {
    margin-top: 7px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: ${T.dim};
  }
  .dp-kpi-delta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: ${T.green};
  }

  /* ── Cards ── */
  .dp-card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 16px;
    padding: 24px;
    transition: border-color .2s;
  }
  .dp-card:hover { border-color: ${T.borderHi}; }
  .dp-card-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: ${T.text};
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dp-card-title::before {
    content: '';
    width: 3px; height: 14px;
    border-radius: 2px;
    background: var(--ac, ${T.cyan});
    display: block;
    flex-shrink: 0;
  }

  /* ── Grids ── */
  .dp-grid-2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; }
  .dp-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
  .dp-section { margin-bottom: 20px; }
  @media (max-width: 900px) {
    .dp-grid-2 { grid-template-columns: 1fr; }
    .dp-grid-3 { grid-template-columns: 1fr; }
  }

  /* ── System status ── */
  .dp-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid ${T.border}55;
  }
  .dp-status-row:last-child { border-bottom: none; }
  .dp-status-name {
    font-size: 12px;
    color: ${T.text};
    text-transform: capitalize;
  }
  .dp-status-count {
    font-family: var(--font-mono);
    font-size: 11px;
    color: ${T.cyan};
    font-weight: 600;
  }
  .dp-status-bar-wrap {
    flex: 1;
    margin: 0 14px;
    height: 3px;
    background: ${T.border};
    border-radius: 2px;
    overflow: hidden;
  }
  .dp-status-bar {
    height: 100%;
    border-radius: 2px;
    background: var(--ac, ${T.cyan});
    transition: width .6s cubic-bezier(.4,0,.2,1);
  }

  /* ── Recent reviews table ── */
  .dp-table-wrap { overflow-x: auto; margin: -4px; }
  .dp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .dp-table th {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: ${T.muted};
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid ${T.border};
    white-space: nowrap;
  }
  .dp-table td {
    padding: 11px 12px;
    border-bottom: 1px solid ${T.border}44;
    vertical-align: middle;
  }
  .dp-table tbody tr { transition: background .15s; }
  .dp-table tbody tr:hover { background: ${T.elevated}; }
  .dp-table tbody tr:last-child td { border-bottom: none; }

  .dp-lang-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 5px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    background: ${T.indigo}22;
    border: 1px solid ${T.indigo}44;
    color: ${T.indigo};
    white-space: nowrap;
  }
  .dp-summary-text {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: ${T.muted};
  }

  /* ── Empty state ── */
  .dp-empty {
    text-align: center;
    padding: 48px 20px;
    color: ${T.dim};
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .dp-empty-icon { font-size: 28px; margin-bottom: 10px; opacity: .4; }

  /* ── Skeleton ── */
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .dp-skel {
    border-radius: 8px;
    background: linear-gradient(90deg, ${T.elevated} 25%, ${T.border} 50%, ${T.elevated} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
  }

  /* ── Tooltip ── */
  .dp-tip {
    background: ${T.elevated};
    border: 1px solid ${T.borderHi};
    border-radius: 10px;
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 11px;
    box-shadow: 0 8px 32px #00000060;
  }
  .dp-tip-label { color: ${T.muted}; margin-bottom: 6px; font-size: 10px; }
  .dp-tip-row { display: flex; gap: 8px; align-items: center; }
  .dp-tip-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

  /* ── Scrollbar ── */
  .dp-root ::-webkit-scrollbar { width: 6px; height: 6px; }
  .dp-root ::-webkit-scrollbar-track { background: ${T.surface}; }
  .dp-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`

/* ─── Custom Tooltip ─────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="dp-tip">
      {label && <div className="dp-tip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="dp-tip-row">
          <span className="dp-tip-dot" style={{ background: p.color }} />
          <span style={{ color: T.muted }}>{p.name}:</span>
          <strong style={{ color: p.color }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

/* ─── Score color ────────────────────────────────────────────────────── */
const scoreColor = s => s >= 8 ? T.green : s >= 6 ? T.amber : T.red

/* ─── Skeleton block ─────────────────────────────────────────────────── */
const Skel = ({ h = 200 }) => <div className="dp-skel" style={{ height: h }} />

/* ─── KPI Card ───────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, delta, color, animClass }) => (
  <div className={`dp-kpi anim ${animClass}`} style={{ '--kc': color }}>
    <div className="dp-kpi-glow" />
    <div className="dp-kpi-label">{label}</div>
    <div className="dp-kpi-value">{value}</div>
    <div className="dp-kpi-sub">
      {delta != null && (
        <span className="dp-kpi-delta">↑ {delta}</span>
      )}{' '}
      {sub}
    </div>
  </div>
)

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [trends, setTrends] = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getDashboard(),
      adminApi.getReviewTrends(14),
      adminApi.getRecentReviews(8),
      adminApi.getSystemHealth(),
    ]).then(([db, tr, rv, hl]) => {
      setDashboard(db.data)
      setTrends(tr.data.trend || [])
      setRecentReviews(rv.data.reviews || [])
      setHealth(hl.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const s = dashboard?.summary || {}
  const isHealthy = health?.status === 'healthy'

  /* Compute max collection count for bar scaling */
  const collections = Object.entries(health?.collections || {})
  const maxCount = Math.max(...collections.map(([, c]) => c), 1)

  const collectionAccents = [T.cyan, T.violet, T.green, T.amber, T.pink, T.indigo]

  return (
    <div className="dp-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="dp-header anim a1">
        <div>
          <div className="dp-eyebrow">Admin Console · Overview</div>
          <div className="dp-title">Dashboard</div>
          <div className="dp-subtitle">Platform overview and key metrics</div>
        </div>
        <div
          className="dp-health-pill"
          style={{
            '--pill-color': isHealthy ? T.green : T.red,
            '--pill-border': isHealthy ? `${T.green}44` : `${T.red}44`,
            '--pill-bg':     isHealthy ? `${T.green}0d` : `${T.red}0d`,
          }}
        >
          <span className={`dp-health-dot${isHealthy ? ' pulse' : ''}`} />
          System {loading ? 'checking…' : (health?.status || 'unknown')}
        </div>
      </div>

      {/* KPIs */}
      <div className="dp-kpi-row">
        <KpiCard
          label="Total Users"
          value={loading ? '—' : (s.total_users || 0).toLocaleString()}
          delta={s.new_users_last_30_days}
          sub="this month"
          color={T.cyan}
          animClass="a2"
        />
        <KpiCard
          label="Total Reviews"
          value={loading ? '—' : (s.total_reviews || 0).toLocaleString()}
          delta={s.reviews_last_30_days}
          sub="this month"
          color={T.violet}
          animClass="a3"
        />
        <KpiCard
          label="Mentor Sessions"
          value={loading ? '—' : (s.total_mentor_sessions || 0).toLocaleString()}
          sub="AI mentor uses"
          color={T.green}
          animClass="a4"
        />
        <KpiCard
          label="Active (30d)"
          value={loading ? '—' : (s.reviews_last_30_days || 0).toLocaleString()}
          sub="reviews this month"
          color={T.amber}
          animClass="a5"
        />
      </div>

      {/* Chart + System Status */}
      <div className="dp-grid-2 dp-section anim a2">
        {/* Trend */}
        <div className="dp-card">
          <div className="dp-card-title" style={{ '--ac': T.cyan }}>Review Activity — Last 14 Days</div>
          {loading ? <Skel h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="dpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.cyan} stopOpacity={.25} />
                    <stop offset="95%" stopColor={T.cyan} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: T.dim, fontSize: 9, fontFamily: "'JetBrains Mono'" }}
                  tickFormatter={d => d.slice(5)}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Reviews"
                  stroke={T.cyan}
                  fill="url(#dpGrad)"
                  strokeWidth={2}
                  dot={{ fill: T.cyan, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: T.cyan, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Status */}
        <div className="dp-card">
          <div className="dp-card-title" style={{ '--ac': T.green }}>System Status</div>
          {loading ? <Skel h={200} /> : health ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '8px 12px', background: `${T.green}0d`, border: `1px solid ${T.green}28`, borderRadius: 8 }}>
                <span style={{ color: T.green, fontSize: 14 }}>✓</span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: T.green, fontWeight: 600 }}>
                  All systems operational
                </span>
              </div>
              {collections.map(([name, count], i) => (
                <div key={name} className="dp-status-row">
                  <span className="dp-status-name">{name.replace(/_/g, ' ')}</span>
                  <div className="dp-status-bar-wrap" style={{ '--ac': collectionAccents[i % collectionAccents.length] }}>
                    <div
                      className="dp-status-bar"
                      style={{
                        width: `${Math.round((count / maxCount) * 100)}%`,
                        background: collectionAccents[i % collectionAccents.length],
                      }}
                    />
                  </div>
                  <span className="dp-status-count" style={{ color: collectionAccents[i % collectionAccents.length] }}>
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="dp-empty">
              <div className="dp-empty-icon">◎</div>
              Unable to fetch system status
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="dp-card dp-section anim a3">
        <div className="dp-card-title" style={{ '--ac': T.violet }}>Recent Reviews</div>
        <div className="dp-table-wrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Language</th>
                <th>Score</th>
                <th>Summary</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentReviews.length > 0 ? recentReviews.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{r.user_name}</td>
                  <td><span className="dp-lang-badge">{r.language}</span></td>
                  <td>
                    <span style={{
                      fontFamily: "'JetBrains Mono'",
                      fontWeight: 700,
                      fontSize: 13,
                      color: scoreColor(r.overall_score),
                    }}>
                      {r.overall_score?.toFixed(1)}
                    </span>
                  </td>
                  <td><div className="dp-summary-text">{r.summary}</div></td>
                  <td style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: T.dim }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5}>
                    <div className="dp-empty">
                      <div className="dp-empty-icon">◎</div>
                      No reviews yet
                    </div>
                  </td>
                </tr>
              )}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j}><div className="dp-skel" style={{ height: 18, borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}