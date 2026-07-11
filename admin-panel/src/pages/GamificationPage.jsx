import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
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

const LEVEL_NAMES = {
  1:'Beginner',2:'Novice',3:'Apprentice',4:'Developer',
  5:'Intermediate',6:'Advanced',7:'Expert',8:'Senior',
  9:'Master',10:'Grandmaster'
}
const LEVEL_COLORS = [
  T.muted, T.green, T.green, T.cyan, T.cyan,
  T.violet, T.violet, T.amber, T.amber, T.red
]

const XP_ACTIONS = [
  { action: 'Complete review',   xp: '20 base XP',   icon: '◐' },
  { action: 'Per bug found',     xp: '+3 XP each',   icon: '🐛' },
  { action: 'Per security issue',xp: '+4 XP each',   icon: '🔒' },
  { action: 'High score bonus',  xp: 'up to +20 XP', icon: '⭐' },
  { action: 'Daily challenge',   xp: '+30–60 XP',    icon: '📅' },
  { action: 'Max per review',    xp: '100 XP cap',   icon: '⚡' },
]

const LEVEL_THRESHOLDS = [
  [1,'Beginner','0'],[2,'Novice','100'],[3,'Apprentice','300'],
  [4,'Developer','600'],[5,'Intermediate','1,000'],[6,'Advanced','1,500'],
  [7,'Expert','2,200'],[8,'Senior','3,000'],[9,'Master','4,000'],
  [10,'Grandmaster','5,500'],
]

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  .gp-root {
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
  .gp-root .anim { opacity: 0; animation: fadeUp .45s ease forwards; }
  .gp-root .a1 { animation-delay: .04s; }
  .gp-root .a2 { animation-delay: .10s; }
  .gp-root .a3 { animation-delay: .17s; }
  .gp-root .a4 { animation-delay: .24s; }
  .gp-root .a5 { animation-delay: .31s; }
  .gp-root .a6 { animation-delay: .38s; }

  /* ── Header ── */
  .gp-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 36px; }
  .gp-eyebrow {
    font-family: var(--font-mono);
    font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
    color: ${T.amber}; margin-bottom: 6px;
  }
  .gp-title { font-size: 32px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
  .gp-subtitle { margin-top: 6px; font-family: var(--font-mono); font-size: 13px; color: ${T.muted}; }

  /* ── KPI row ── */
  .gp-kpi-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
  @media (max-width: 900px) { .gp-kpi-row { grid-template-columns: repeat(2,1fr); } }
  .gp-kpi {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: 14px; padding: 20px 22px;
    position: relative; overflow: hidden; cursor: default;
    transition: border-color .2s, transform .2s;
  }
  .gp-kpi:hover { border-color: ${T.borderHi}; transform: translateY(-2px); }
  .gp-kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px; background: var(--kc); opacity: .75;
  }
  .gp-kpi-glow {
    position: absolute; top: -30px; right: -30px;
    width: 90px; height: 90px; border-radius: 50%;
    background: var(--kc); opacity: .05; pointer-events: none;
  }
  .gp-kpi-label {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: .12em; text-transform: uppercase;
    color: ${T.muted}; margin-bottom: 10px;
  }
  .gp-kpi-value {
    font-family: var(--font-mono); font-size: 28px;
    font-weight: 700; color: var(--kc); line-height: 1; letter-spacing: -.02em;
  }
  .gp-kpi-value.sm { font-size: 18px; }
  .gp-kpi-sub { margin-top: 7px; font-family: var(--font-mono); font-size: 10px; color: ${T.dim}; }

  /* ── Cards ── */
  .gp-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: 16px; padding: 24px;
    transition: border-color .2s;
  }
  .gp-card:hover { border-color: ${T.borderHi}; }
  .gp-card-title {
    font-size: 13px; font-weight: 700; letter-spacing: .04em;
    text-transform: uppercase; color: ${T.text};
    margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
  }
  .gp-card-title::before {
    content: ''; width: 3px; height: 14px; border-radius: 2px;
    background: var(--ac, ${T.amber}); display: block; flex-shrink: 0;
  }

  /* ── Grids ── */
  .gp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .gp-section { margin-bottom: 20px; }
  @media (max-width: 900px) { .gp-grid-2 { grid-template-columns: 1fr; } }

  /* ── Level legend ── */
  .gp-level-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 14px; }
  .gp-level-row {
    display: flex; align-items: center; gap: 6px;
    padding: 4px 6px; border-radius: 6px;
    transition: background .15s;
  }
  .gp-level-row:hover { background: ${T.elevated}; }
  .gp-level-dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
  .gp-level-label { font-size: 10px; color: ${T.muted}; flex: 1; }
  .gp-level-count { font-family: var(--font-mono); font-size: 10px; color: ${T.dim}; }

  /* ── Badges ── */
  .gp-badge-row {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 0; border-bottom: 1px solid ${T.border}44;
  }
  .gp-badge-row:last-child { border-bottom: none; }
  .gp-badge-emoji { font-size: 26px; flex-shrink: 0; }
  .gp-badge-name { font-size: 13px; font-weight: 600; color: ${T.text}; }
  .gp-badge-desc { font-size: 11px; color: ${T.muted}; margin-top: 2px; }
  .gp-progress-track {
    margin-top: 7px; height: 3px; background: ${T.border};
    border-radius: 2px; overflow: hidden;
  }
  .gp-progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, ${T.amber}, ${T.amber}88);
    transition: width .6s cubic-bezier(.4,0,.2,1);
  }
  .gp-badge-count {
    font-family: var(--font-mono); font-size: 14px;
    font-weight: 700; color: ${T.amber}; flex-shrink: 0;
  }

  /* ── Badge chips ── */
  .gp-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
  .gp-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    background: ${T.elevated}; border: 1px solid ${T.border};
    font-size: 11px; color: ${T.muted};
    transition: border-color .15s, color .15s;
  }
  .gp-chip:hover { border-color: ${T.borderHi}; color: ${T.text}; }

  /* ── Leaderboard table ── */
  .gp-table-wrap { overflow-x: auto; margin: -4px; }
  .gp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .gp-table th {
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: .14em; text-transform: uppercase;
    color: ${T.muted}; text-align: left;
    padding: 8px 12px; border-bottom: 1px solid ${T.border}; white-space: nowrap;
  }
  .gp-table td { padding: 12px 12px; border-bottom: 1px solid ${T.border}44; vertical-align: middle; }
  .gp-table tbody tr { transition: background .15s; }
  .gp-table tbody tr:hover { background: ${T.elevated}; }
  .gp-table tbody tr:last-child td { border-bottom: none; }
  .gp-avatar {
    width: 32px; height: 32px; border-radius: 10px;
    background: ${T.violet}22; border: 1px solid ${T.violet}44;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 12px; color: ${T.violet};
    overflow: hidden; flex-shrink: 0;
  }
  .gp-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .gp-user-cell { display: flex; align-items: center; gap: 10px; }
  .gp-level-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: var(--font-mono); font-size: 10px;
    padding: 3px 8px; border-radius: 5px;
    background: var(--lc)22; border: 1px solid var(--lc)44; color: var(--lc);
    white-space: nowrap;
  }

  /* ── XP reference cards ── */
  .gp-xp-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  @media (max-width: 700px) { .gp-xp-grid { grid-template-columns: 1fr 1fr; } }
  .gp-xp-card {
    background: ${T.elevated}; border: 1px solid ${T.border};
    border-radius: 10px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    transition: border-color .15s;
  }
  .gp-xp-card:hover { border-color: ${T.borderHi}; }
  .gp-xp-icon { font-size: 20px; flex-shrink: 0; }
  .gp-xp-action { font-size: 12px; color: ${T.muted}; font-weight: 600; }
  .gp-xp-val { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: ${T.amber}; margin-top: 2px; }

  /* ── Level threshold grid ── */
  .gp-lvl-thresh {
    display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-top: 16px;
  }
  @media (max-width: 700px) { .gp-lvl-thresh { grid-template-columns: repeat(2,1fr); } }
  .gp-lvl-card {
    background: ${T.elevated}; border: 1px solid ${T.border};
    border-radius: 10px; padding: 12px 10px; text-align: center;
    position: relative; overflow: hidden;
    transition: border-color .15s, transform .15s;
  }
  .gp-lvl-card:hover { border-color: var(--lc)66; transform: translateY(-2px); }
  .gp-lvl-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--lc); }
  .gp-lvl-num { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--lc); }
  .gp-lvl-name { font-size: 10px; color: ${T.muted}; font-weight: 600; margin-top: 2px; }
  .gp-lvl-xp { font-family: var(--font-mono); font-size: 10px; color: ${T.dim}; margin-top: 4px; }

  /* ── Empty state ── */
  .gp-empty { text-align: center; padding: 48px 20px; color: ${T.dim}; font-family: var(--font-mono); font-size: 12px; }
  .gp-empty-icon { font-size: 28px; margin-bottom: 10px; opacity: .4; }

  /* ── Skeleton ── */
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .gp-skel {
    border-radius: 8px;
    background: linear-gradient(90deg, ${T.elevated} 25%, ${T.border} 50%, ${T.elevated} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
  }

  /* ── Tooltip ── */
  .gp-tip {
    background: ${T.elevated}; border: 1px solid ${T.borderHi};
    border-radius: 10px; padding: 10px 14px;
    font-family: var(--font-mono); font-size: 11px;
    box-shadow: 0 8px 32px #00000060;
  }
  .gp-tip-label { color: ${T.muted}; margin-bottom: 6px; font-size: 10px; }
  .gp-tip-row { display: flex; gap: 8px; align-items: center; }
  .gp-tip-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

  /* ── Scrollbar ── */
  .gp-root ::-webkit-scrollbar { width: 6px; height: 6px; }
  .gp-root ::-webkit-scrollbar-track { background: ${T.surface}; }
  .gp-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`

/* ─── Tooltip ────────────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="gp-tip">
      {label && <div className="gp-tip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="gp-tip-row">
          <span className="gp-tip-dot" style={{ background: p.color }} />
          <span style={{ color: T.muted }}>{p.name}:</span>
          <strong style={{ color: p.color }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, color, small, animClass }) => (
  <div className={`gp-kpi anim ${animClass}`} style={{ '--kc': color }}>
    <div className="gp-kpi-glow" />
    <div className="gp-kpi-label">{label}</div>
    <div className={`gp-kpi-value${small ? ' sm' : ''}`}>{value}</div>
    <div className="gp-kpi-sub">{sub}</div>
  </div>
)

/* ─── Skeleton ───────────────────────────────────────────────────────── */
const Skel = ({ h = 220 }) => <div className="gp-skel" style={{ height: h }} />

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function GamificationPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getGamificationStats()
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const levelData = Object.entries(stats?.level_distribution || {}).map(([level, count]) => ({
    level: `Lv.${level}`,
    name: LEVEL_NAMES[parseInt(level)] || level,
    count,
    color: LEVEL_COLORS[parseInt(level) - 1] || T.muted,
  }))

  const leaderboard = stats?.top_earners || []
  const topBadges   = stats?.most_common_badges || []
  const maxBadge    = topBadges[0]?.count || 1

  const lvlColor = l => LEVEL_COLORS[(l || 1) - 1] || T.muted

  return (
    <div className="gp-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="gp-header anim a1">
        <div>
          <div className="gp-eyebrow">Admin Console · Gamification</div>
          <div className="gp-title">Gamification</div>
          <div className="gp-subtitle">XP system, levels, leaderboard and achievements</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="gp-kpi-row">
        <KpiCard
          label="Total XP Distributed"
          value={loading ? '—' : ((stats?.total_xp_distributed || 0) / 1000).toFixed(1) + 'k'}
          sub="across all users"
          color={T.amber}
          animClass="a2"
        />
        <KpiCard
          label="Avg XP / User"
          value={loading ? '—' : (stats?.average_xp || 0).toLocaleString()}
          sub="average earned"
          color={T.cyan}
          animClass="a3"
        />
        <KpiCard
          label="Users with XP"
          value={loading ? '—' : (stats?.total_users_with_xp || 0).toLocaleString()}
          sub="active participants"
          color={T.green}
          animClass="a4"
        />
        <KpiCard
          label="Top Badge"
          value={loading ? '—' : (topBadges[0]?.badge?.name || 'None')}
          sub={`${topBadges[0]?.count || 0} users earned`}
          color={T.violet}
          small
          animClass="a5"
        />
      </div>

      {/* Level dist + Badges */}
      <div className="gp-grid-2 gp-section anim a2">
        {/* Level distribution */}
        <div className="gp-card">
          <div className="gp-card-title" style={{ '--ac': T.cyan }}>Level Distribution</div>
          {loading ? <Skel h={220} /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={levelData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }} barGap={4}>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false} />
                  <XAxis dataKey="level" tick={{ fill: T.muted, fontSize: 9, fontFamily: "'JetBrains Mono'" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.dim, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} cursor={{ fill: `${T.borderHi}44` }} />
                  <Bar dataKey="count" name="Users" radius={[6, 6, 0, 0]}>
                    {levelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="gp-level-grid">
                {levelData.map(l => (
                  <div key={l.level} className="gp-level-row">
                    <div className="gp-level-dot" style={{ background: l.color }} />
                    <span className="gp-level-label">{l.level} — {l.name}</span>
                    <span className="gp-level-count">{l.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Most Earned Badges */}
        <div className="gp-card">
          <div className="gp-card-title" style={{ '--ac': T.amber }}>Most Earned Badges</div>
          {loading ? <Skel h={220} /> : topBadges.length === 0 ? (
            <div className="gp-empty">
              <div className="gp-empty-icon">🏅</div>
              No badges earned yet
            </div>
          ) : (
            <>
              {topBadges.map(item => (
                <div key={item.badge?.id} className="gp-badge-row">
                  <span className="gp-badge-emoji">{item.badge?.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="gp-badge-name">{item.badge?.name}</div>
                    <div className="gp-badge-desc">{item.badge?.description}</div>
                    <div className="gp-progress-track">
                      <div
                        className="gp-progress-fill"
                        style={{ width: `${Math.min(100, (item.count / maxBadge) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="gp-badge-count">×{item.count}</span>
                </div>
              ))}

              {/* All badge chips */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
                  All Available Badges
                </div>
                <div className="gp-chips">
                  {[
                    { emoji: '🏅', name: 'Bug Hunter' },
                    { emoji: '🏅', name: 'Clean Code Master' },
                    { emoji: '🏅', name: 'Refactoring Pro' },
                    { emoji: '⭐', name: 'First Step' },
                    { emoji: '🌐', name: 'Polyglot' },
                    { emoji: '🔥', name: 'Streak Master' },
                    { emoji: '🔒', name: 'Security Expert' },
                    { emoji: '⚡', name: 'Speed Reviewer' },
                    { emoji: '💎', name: 'High Scorer' },
                    { emoji: '💯', name: 'Centurion' },
                  ].map(b => (
                    <div key={b.name} className="gp-chip">
                      <span>{b.emoji}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="gp-card gp-section anim a3">
        <div className="gp-card-title" style={{ '--ac': T.amber }}>🏆 Global Leaderboard</div>
        {loading ? <Skel h={200} /> : leaderboard.length === 0 ? (
          <div className="gp-empty">
            <div className="gp-empty-icon">🏆</div>
            No users on the leaderboard yet
          </div>
        ) : (
          <div className="gp-table-wrap">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>XP</th>
                  <th>Level</th>
                  <th>Reviews</th>
                  <th>Badges</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => {
                  const lc = lvlColor(entry.level)
                  return (
                    <tr key={entry.user_id}>
                      <td>
                        <span style={{ fontSize: i < 3 ? 18 : 12, fontFamily: "'JetBrains Mono'", color: T.dim }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td>
                        <div className="gp-user-cell">
                          <div className="gp-avatar">
                            {entry.profile_pic ? <img src={entry.profile_pic} alt="" /> : entry.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{entry.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: "'JetBrains Mono'", color: T.amber, fontWeight: 700, fontSize: 14 }}>
                          {entry.xp?.toLocaleString()}
                        </span>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: T.dim, marginLeft: 4 }}>XP</span>
                      </td>
                      <td>
                        <span className="gp-level-badge" style={{ '--lc': lc }}>
                          Lv.{entry.level} {entry.level_name}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, color: T.cyan }}>
                          {entry.total_reviews}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.muted }}>
                          🏅 {entry.badges_count}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* XP Reference + Level Thresholds */}
      <div className="gp-card gp-section anim a4">
        <div className="gp-card-title" style={{ '--ac': T.violet }}>XP System Reference</div>
        <div className="gp-xp-grid">
          {XP_ACTIONS.map(item => (
            <div key={item.action} className="gp-xp-card">
              <span className="gp-xp-icon">{item.icon}</span>
              <div>
                <div className="gp-xp-action">{item.action}</div>
                <div className="gp-xp-val">{item.xp}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>
            Level Thresholds
          </div>
          <div className="gp-lvl-thresh">
            {LEVEL_THRESHOLDS.map(([lvl, name, xp]) => {
              const lc = LEVEL_COLORS[lvl - 1]
              return (
                <div key={lvl} className="gp-lvl-card" style={{ '--lc': lc }}>
                  <div className="gp-lvl-num">Lv.{lvl}</div>
                  <div className="gp-lvl-name">{name}</div>
                  <div className="gp-lvl-xp">{xp} XP</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}