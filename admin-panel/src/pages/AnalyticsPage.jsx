import { useState, useEffect, useRef } from 'react'
import { adminApi } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'

/* ─── Design Tokens ─────────────────────────────────────────────────── */
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

const PALETTE = [T.cyan, T.violet, T.green, T.amber, T.red, T.pink, T.indigo, T.lime]

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  .ap-root {
    --font-head: 'Syne', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    background: ${T.bg};
    color: ${T.text};
    font-family: var(--font-head);
    min-height: 100vh;
    padding: 32px;
    box-sizing: border-box;
  }

  /* ── Fade-in animation ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ap-root .anim { opacity: 0; animation: fadeUp .45s ease forwards; }
  .ap-root .anim-1 { animation-delay: .05s; }
  .ap-root .anim-2 { animation-delay: .12s; }
  .ap-root .anim-3 { animation-delay: .20s; }
  .ap-root .anim-4 { animation-delay: .28s; }
  .ap-root .anim-5 { animation-delay: .36s; }

  /* ── Header ── */
  .ap-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 36px;
  }
  .ap-eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: ${T.cyan};
    margin-bottom: 6px;
  }
  .ap-title {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -.02em;
    line-height: 1;
    color: ${T.text};
  }
  .ap-subtitle {
    margin-top: 6px;
    font-size: 13px;
    color: ${T.muted};
    font-family: var(--font-mono);
  }

  /* ── Refresh ── */
  .ap-refresh {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid ${T.borderHi};
    border-radius: 8px;
    color: ${T.muted};
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    transition: all .2s;
  }
  .ap-refresh:hover { border-color: ${T.cyan}; color: ${T.cyan}; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .ap-refresh.loading svg { animation: spin .8s linear infinite; }

  /* ── KPI row ── */
  .ap-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) {
    .ap-kpi-row { grid-template-columns: repeat(2, 1fr); }
  }
  .ap-kpi {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 14px;
    padding: 20px 22px;
    position: relative;
    overflow: hidden;
    transition: border-color .2s, transform .2s;
  }
  .ap-kpi:hover { border-color: ${T.borderHi}; transform: translateY(-2px); }
  .ap-kpi::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--kpi-color);
    opacity: .7;
  }
  .ap-kpi-icon {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: var(--kpi-color);
    opacity: .12;
    position: absolute;
    top: 18px; right: 18px;
    display: flex; align-items: center; justify-content: center;
  }
  .ap-kpi-icon-inner {
    position: absolute;
    top: 18px; right: 18px;
    width: 34px; height: 34px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .ap-kpi-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: ${T.muted};
    margin-bottom: 10px;
  }
  .ap-kpi-value {
    font-family: var(--font-mono);
    font-size: 28px;
    font-weight: 700;
    color: var(--kpi-color);
    line-height: 1;
  }
  .ap-kpi-sub {
    margin-top: 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: ${T.dim};
  }

  /* ── Cards ── */
  .ap-card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 16px;
    padding: 24px;
    transition: border-color .2s;
  }
  .ap-card:hover { border-color: ${T.borderHi}; }
  .ap-card-title {
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
  .ap-card-title::before {
    content: '';
    width: 3px; height: 14px;
    border-radius: 2px;
    background: var(--accent, ${T.cyan});
    display: block;
    flex-shrink: 0;
  }

  /* ── Grid layouts ── */
  .ap-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .ap-grid-3 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }
  @media (max-width: 900px) {
    .ap-grid-2 { grid-template-columns: 1fr; }
    .ap-grid-3 { grid-template-columns: 1fr; }
  }
  .ap-section { margin-bottom: 20px; }

  /* ── Trend toggle ── */
  .ap-toggle-group { display: flex; gap: 6px; }
  .ap-toggle {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid ${T.border};
    background: transparent;
    font-family: var(--font-mono);
    font-size: 11px;
    color: ${T.muted};
    cursor: pointer;
    transition: all .15s;
  }
  .ap-toggle:hover { border-color: ${T.borderHi}; color: ${T.text}; }
  .ap-toggle.active { background: ${T.cyan}18; border-color: ${T.cyan}; color: ${T.cyan}; }

  /* ── Table ── */
  .ap-table-wrap { overflow-x: auto; margin: -4px -4px 0; }
  .ap-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .ap-table th {
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
  .ap-table td {
    padding: 12px 12px;
    border-bottom: 1px solid ${T.border}66;
    vertical-align: middle;
  }
  .ap-table tbody tr { transition: background .15s; }
  .ap-table tbody tr:hover { background: ${T.elevated}; }
  .ap-table tbody tr:last-child td { border-bottom: none; }

  .ap-avatar {
    width: 32px; height: 32px;
    border-radius: 10px;
    background: ${T.violet}22;
    border: 1px solid ${T.violet}44;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700;
    font-size: 12px;
    color: ${T.violet};
    overflow: hidden;
    flex-shrink: 0;
  }
  .ap-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .ap-user-cell { display: flex; align-items: center; gap: 10px; }
  .ap-user-name { font-weight: 600; font-size: 13px; color: ${T.text}; }
  .ap-user-email { font-family: var(--font-mono); font-size: 10px; color: ${T.muted}; margin-top: 1px; }

  .ap-mono { font-family: var(--font-mono); font-weight: 700; }
  .ap-badge-level {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 5px;
    background: var(--lc)22;
    border: 1px solid var(--lc)44;
    color: var(--lc);
    white-space: nowrap;
  }
  .ap-rank { font-family: var(--font-mono); font-size: 12px; color: ${T.muted}; }

  /* ── Language row ── */
  .ap-lang-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid ${T.border}55;
  }
  .ap-lang-row:last-child { border-bottom: none; }
  .ap-lang-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .ap-lang-name { font-size: 12px; color: ${T.text}; font-weight: 600; }
  .ap-lang-meta { display: flex; gap: 14px; font-family: var(--font-mono); font-size: 10px; color: ${T.muted}; }
  .ap-lang-score { color: ${T.green}; font-weight: 700; }

  /* ── Skeleton ── */
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .ap-skeleton {
    border-radius: 8px;
    background: linear-gradient(90deg, ${T.elevated} 25%, ${T.border} 50%, ${T.elevated} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
  }

  /* ── Scrollbar ── */
  .ap-root ::-webkit-scrollbar { width: 6px; height: 6px; }
  .ap-root ::-webkit-scrollbar-track { background: ${T.surface}; }
  .ap-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`

/* ─── Custom Tooltip ─────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.elevated,
      border: `1px solid ${T.borderHi}`,
      borderRadius: 10,
      padding: '10px 14px',
      fontFamily: `'JetBrains Mono', monospace`,
      fontSize: 11,
      boxShadow: `0 8px 32px #00000060`,
    }}>
      {label && <div style={{ color: T.muted, marginBottom: 6, fontSize: 10 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: T.text, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ color: T.muted }}>{p.name}:</span>
          <strong style={{ color: p.color }}>
            {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(2) : p.value}
          </strong>
        </div>
      ))}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, icon, color, delay }) => (
  <div className={`ap-kpi anim anim-${delay}`} style={{ '--kpi-color': color }}>
    <div className="ap-kpi-icon" />
    <div className="ap-kpi-icon-inner">{icon}</div>
    <div className="ap-kpi-label">{label}</div>
    <div className="ap-kpi-value">{value}</div>
    {sub && <div className="ap-kpi-sub">{sub}</div>}
  </div>
)

/* ─── Level color ────────────────────────────────────────────────────── */
const lvlColor = l => l >= 9 ? T.amber : l >= 7 ? T.violet : l >= 5 ? T.cyan : T.green

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [topUsers, setTopUsers] = useState([])
  const [languages, setLanguages] = useState([])
  const [trends, setTrends] = useState([])
  const [distribution, setDistribution] = useState([])
  const [trendDays, setTrendDays] = useState(30)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [tu, lg, tr, dist] = await Promise.all([
        adminApi.getTopUsers(10),
        adminApi.getLanguageStats(),
        adminApi.getReviewTrends(trendDays),
        adminApi.getScoreDistribution(),
      ])
      setTopUsers(tu.data.top_users || [])
      setLanguages(lg.data.languages || [])
      setTrends(tr.data.trend || [])
      setDistribution(dist.data.distribution || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [trendDays])

  /* Derived KPIs */
  const totalReviews  = topUsers.reduce((s, u) => s + (u.total_reviews || 0), 0)
  const avgScore      = topUsers.length ? (topUsers.reduce((s, u) => s + (u.avg_score || 0), 0) / topUsers.length) : 0
  const totalXP       = topUsers.reduce((s, u) => s + (u.xp || 0), 0)
  const activeToday   = topUsers.filter(u => {
    if (!u.last_activity) return false
    const d = new Date(u.last_activity)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  const Skel = ({ h = 220 }) => (
    <div className="ap-skeleton" style={{ height: h }} />
  )

  return (
    <div className="ap-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="ap-header anim anim-1">
        <div>
          <div className="ap-eyebrow">Admin Console · Platform Insights</div>
          <div className="ap-title">Analytics</div>
          <div className="ap-subtitle">Detailed platform statistics and trends</div>
        </div>
        <button
          className={`ap-refresh${loading ? ' loading' : ''}`}
          onClick={load}
          disabled={loading}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Row */}
      <div className="ap-kpi-row">
        <KpiCard label="Total Reviews" value={loading ? '—' : totalReviews.toLocaleString()} sub="across top 10 users" icon="📋" color={T.cyan} delay={2} />
        <KpiCard label="Avg Score" value={loading ? '—' : avgScore.toFixed(2)} sub="platform-wide" icon="⭐" color={T.amber} delay={3} />
        <KpiCard label="Total XP" value={loading ? '—' : (totalXP / 1000).toFixed(1) + 'k'} sub="accumulated" icon="⚡" color={T.violet} delay={4} />
        <KpiCard label="Active Today" value={loading ? '—' : activeToday} sub="of top users" icon="🟢" color={T.green} delay={5} />
      </div>

      {/* Top users bar + Trend */}
      <div className="ap-grid-3 ap-section anim anim-2">
        {/* Bar chart */}
        <div className="ap-card">
          <div className="ap-card-title" style={{ '--accent': T.cyan }}>Top Users by Reviews</div>
          {loading ? <Skel h={260} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topUsers.slice(0, 8)} margin={{ top: 4, right: 4, bottom: 28, left: -16 }} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: T.muted, fontSize: 10, fontFamily: "'JetBrains Mono'" }}
                  tickFormatter={n => n.length > 10 ? n.slice(0, 10) + '…' : n}
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: `${T.borderHi}44` }} />
                <Bar dataKey="total_reviews" name="Reviews" fill={T.cyan} radius={[6, 6, 0, 0]} />
                <Bar dataKey="avg_score" name="Avg Score" fill={T.violet} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Score Distribution */}
        <div className="ap-card">
          <div className="ap-card-title" style={{ '--accent': T.amber }}>Score Distribution</div>
          {loading ? <Skel h={260} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution} margin={{ top: 4, right: 4, bottom: 44, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis
                  dataKey="range"
                  tick={{ fill: T.muted, fontSize: 9, fontFamily: "'JetBrains Mono'" }}
                  angle={-40}
                  textAnchor="end"
                  axisLine={false} tickLine={false}
                />
                <YAxis tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: `${T.borderHi}44` }} />
                <Bar dataKey="count" name="Reviews" radius={[6, 6, 0, 0]}>
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Area trend + Language */}
      <div className="ap-grid-2 ap-section anim anim-3">
        {/* Trend */}
        <div className="ap-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="ap-card-title" style={{ '--accent': T.indigo, margin: 0 }}>Review Trend</div>
            <div className="ap-toggle-group">
              {[7, 14, 30, 60].map(d => (
                <button
                  key={d}
                  className={`ap-toggle${trendDays === d ? ' active' : ''}`}
                  onClick={() => setTrendDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {loading ? <Skel h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.cyan}   stopOpacity={.25} />
                    <stop offset="95%" stopColor={T.cyan}   stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.violet} stopOpacity={.25} />
                    <stop offset="95%" stopColor={T.violet} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: T.dim, fontSize: 9 }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: T.dim, fontSize: 9 }} domain={[0, 10]} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area yAxisId="left"  type="monotone" dataKey="count"     name="Reviews"   stroke={T.cyan}   fill="url(#gCyan)"   strokeWidth={2} dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="avg_score" name="Avg Score" stroke={T.violet} fill="url(#gViolet)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Language */}
        <div className="ap-card">
          <div className="ap-card-title" style={{ '--accent': T.green }}>Language Breakdown</div>
          {loading ? <Skel h={200} /> : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={languages.slice(0, 8)}
                    dataKey="count"
                    nameKey="language"
                    cx="50%" cy="50%"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {languages.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8 }}>
                {languages.slice(0, 6).map((lang, i) => (
                  <div key={lang.language} className="ap-lang-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="ap-lang-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="ap-lang-name">{lang.language}</span>
                    </div>
                    <div className="ap-lang-meta">
                      <span>{lang.count} reviews</span>
                      <span className="ap-lang-score">{lang.avg_score.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full user table */}
      <div className="ap-card ap-section anim anim-4">
        <div className="ap-card-title" style={{ '--accent': T.violet }}>Leaderboard — Full Details</div>
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Reviews</th>
                <th>Avg Score</th>
                <th>XP</th>
                <th>Level</th>
                <th>Badges</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.user_id}>
                  <td>
                    <span className="ap-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontFamily: "'JetBrains Mono'", color: T.dim }}>#{i + 1}</span>}
                    </span>
                  </td>
                  <td>
                    <div className="ap-user-cell">
                      <div className="ap-avatar">
                        {u.profile_pic
                          ? <img src={u.profile_pic} alt="" />
                          : u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="ap-user-name">{u.name}</div>
                        <div className="ap-user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="ap-mono" style={{ color: T.cyan }}>{u.total_reviews}</span>
                  </td>
                  <td>
                    <span className="ap-mono" style={{
                      color: u.avg_score >= 8 ? T.green : u.avg_score >= 6 ? T.amber : T.red
                    }}>
                      {u.avg_score?.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <span className="ap-mono" style={{ color: T.amber }}>{u.xp?.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="ap-badge-level" style={{ '--lc': lvlColor(u.level) }}>
                      Lv.{u.level} {u.level_name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.muted }}>
                      🏅 {u.badges_count}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: T.dim }}>
                      {u.last_activity ? new Date(u.last_activity).toLocaleDateString() : '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="ap-skeleton" style={{ height: 20, borderRadius: 4 }} /></td>
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