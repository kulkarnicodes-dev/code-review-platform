import { useState, useEffect } from 'react'
import { adminApi } from '../api'

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
  indigo:   '#6366f1',
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  .rp-root {
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
  .rp-root .anim { opacity: 0; animation: fadeUp .45s ease forwards; }
  .rp-root .a1 { animation-delay: .04s; }
  .rp-root .a2 { animation-delay: .12s; }
  .rp-root .a3 { animation-delay: .20s; }

  /* ── Header ── */
  .rp-header {
    display: flex; justify-content: space-between;
    align-items: flex-end; margin-bottom: 28px;
  }
  .rp-eyebrow {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: .18em; text-transform: uppercase;
    color: ${T.violet}; margin-bottom: 6px;
  }
  .rp-title { font-size: 32px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
  .rp-subtitle { margin-top: 6px; font-family: var(--font-mono); font-size: 13px; color: ${T.muted}; }
  .rp-count-pill {
    font-family: var(--font-mono); font-size: 11px;
    padding: 7px 14px; border-radius: 8px;
    background: ${T.elevated}; border: 1px solid ${T.border};
    color: ${T.muted};
  }
  .rp-count-pill strong { color: ${T.cyan}; }

  /* ── Filter bar ── */
  .rp-filters {
    display: flex; gap: 10px; align-items: center;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .rp-search-wrap { position: relative; flex: 1; min-width: 200px; }
  .rp-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: ${T.dim}; font-size: 13px;
    pointer-events: none; transition: color .2s;
  }
  .rp-search {
    width: 100%; background: ${T.elevated};
    border: 1px solid ${T.border}; border-radius: 10px;
    padding: 9px 14px 9px 36px;
    font-family: var(--font-mono); font-size: 12px;
    color: ${T.text}; outline: none;
    transition: border-color .2s, box-shadow .2s;
    box-sizing: border-box;
  }
  .rp-search::placeholder { color: ${T.dim}; }
  .rp-search:focus { border-color: ${T.violet}88; box-shadow: 0 0 0 3px ${T.violet}12; }
  .rp-search:focus ~ .rp-search-icon { color: ${T.violet}; }
  .rp-select {
    background: ${T.elevated}; border: 1px solid ${T.border};
    border-radius: 10px; padding: 9px 14px;
    font-family: var(--font-mono); font-size: 11px;
    color: ${T.muted}; outline: none; cursor: pointer;
    transition: border-color .2s;
    appearance: none; padding-right: 28px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234d6380'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }
  .rp-select:focus { border-color: ${T.violet}88; }

  /* ── Card ── */
  .rp-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: 16px; overflow: hidden;
    transition: border-color .2s;
  }

  /* ── Table ── */
  .rp-table-wrap { overflow-x: auto; }
  .rp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .rp-table th {
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: .14em; text-transform: uppercase;
    color: ${T.muted}; text-align: left;
    padding: 14px 16px; border-bottom: 1px solid ${T.border};
    white-space: nowrap; background: ${T.elevated};
    cursor: pointer; user-select: none;
    transition: color .15s;
  }
  .rp-table th:hover { color: ${T.text}; }
  .rp-table th.sorted { color: ${T.violet}; }
  .rp-table th .sort-icon { margin-left: 4px; opacity: .5; }
  .rp-table th.sorted .sort-icon { opacity: 1; }

  .rp-table td { padding: 13px 16px; border-bottom: 1px solid ${T.border}44; vertical-align: middle; }
  .rp-table tbody tr { transition: background .15s; }
  .rp-table tbody tr:hover { background: ${T.elevated}; }
  .rp-table tbody tr:last-child td { border-bottom: none; }

  /* ── Score cell ── */
  .rp-score-cell { display: flex; align-items: center; gap: 10px; min-width: 120px; }
  .rp-score-num {
    font-family: var(--font-mono); font-weight: 700;
    font-size: 15px; width: 34px; flex-shrink: 0;
  }
  .rp-score-track {
    flex: 1; height: 4px; background: ${T.border};
    border-radius: 2px; overflow: hidden;
  }
  .rp-score-fill {
    height: 100%; border-radius: 2px;
    transition: width .4s cubic-bezier(.4,0,.2,1);
  }

  /* ── Quality badge ── */
  .rp-quality {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 6px;
    font-family: var(--font-mono); font-size: 10px; font-weight: 600;
    background: var(--qbg); border: 1px solid var(--qborder); color: var(--qcolor);
    white-space: nowrap;
  }

  /* ── Language badge ── */
  .rp-lang {
    display: inline-flex; align-items: center;
    padding: 3px 9px; border-radius: 6px;
    font-family: var(--font-mono); font-size: 10px; font-weight: 600;
    background: ${T.indigo}1a; border: 1px solid ${T.indigo}44; color: ${T.indigo};
    white-space: nowrap;
  }

  /* ── Summary ── */
  .rp-summary {
    max-width: 260px; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
    font-size: 12px; color: ${T.muted};
  }

  /* ── Date ── */
  .rp-date { font-family: var(--font-mono); font-size: 10px; color: ${T.dim}; white-space: nowrap; }

  /* ── User cell ── */
  .rp-user { font-weight: 600; font-size: 13px; color: ${T.text}; }

  /* ── Empty / loading ── */
  .rp-empty {
    text-align: center; padding: 60px 20px;
    font-family: var(--font-mono); font-size: 12px; color: ${T.dim};
  }
  .rp-empty-icon { font-size: 28px; margin-bottom: 12px; opacity: .35; }

  /* ── Skeleton ── */
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .rp-skel {
    border-radius: 6px;
    background: linear-gradient(90deg, ${T.elevated} 25%, ${T.border} 50%, ${T.elevated} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
  }

  /* ── Footer ── */
  .rp-footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px; border-top: 1px solid ${T.border};
    background: ${T.elevated};
    font-family: var(--font-mono); font-size: 10px; color: ${T.dim};
  }

  /* ── Scrollbar ── */
  .rp-root ::-webkit-scrollbar { width: 6px; height: 6px; }
  .rp-root ::-webkit-scrollbar-track { background: ${T.surface}; }
  .rp-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`

/* ─── Helpers ────────────────────────────────────────────────────────── */
const scoreColor = s => s >= 8 ? T.green : s >= 6 ? T.amber : T.red
const scoreLabel = s => {
  if (s >= 9) return ['Excellent', T.green]
  if (s >= 8) return ['Great',     T.green]
  if (s >= 6) return ['Good',      T.amber]
  if (s >= 4) return ['Average',   T.amber]
  return              ['Poor',      T.red]
}

const Skel = () => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length: 6 }).map((_, j) => (
          <td key={j}>
            <div className="rp-skel" style={{ height: 16, width: j === 4 ? 200 : j === 0 ? 90 : 60 }} />
          </td>
        ))}
      </tr>
    ))}
  </>
)

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function ReviewsPage() {
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [langFilter, setLang]   = useState('all')
  const [qualFilter, setQual]   = useState('all')
  const [sortKey, setSortKey]   = useState('created_at')
  const [sortDir, setSortDir]   = useState(-1) // -1 = desc

  useEffect(() => {
    adminApi.getRecentReviews(50)
      .then(r => setReviews(r.data.reviews || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  /* Derived language list */
  const langs = ['all', ...Array.from(new Set(reviews.map(r => r.language).filter(Boolean)))]

  /* Filter + sort */
  const filtered = reviews
    .filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        r.user_name?.toLowerCase().includes(q) ||
        r.language?.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q)
      const matchLang = langFilter === 'all' || r.language === langFilter
      const matchQual =
        qualFilter === 'all' ? true :
        qualFilter === 'excellent' ? r.overall_score >= 9 :
        qualFilter === 'great'     ? (r.overall_score >= 8 && r.overall_score < 9) :
        qualFilter === 'good'      ? (r.overall_score >= 6 && r.overall_score < 8) :
        qualFilter === 'poor'      ? r.overall_score < 6 : true
      return matchSearch && matchLang && matchQual
    })
    .sort((a, b) => {
      const av = sortKey === 'created_at' ? new Date(a[sortKey]) : a[sortKey]
      const bv = sortKey === 'created_at' ? new Date(b[sortKey]) : b[sortKey]
      return sortDir * (av > bv ? 1 : av < bv ? -1 : 0)
    })

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(-1) }
  }

  const SortIcon = ({ k }) => (
    <span className="sort-icon">
      {sortKey === k ? (sortDir === 1 ? '↑' : '↓') : '↕'}
    </span>
  )

  return (
    <div className="rp-root">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="rp-header anim a1">
        <div>
          <div className="rp-eyebrow">Admin Console · Reviews</div>
          <div className="rp-title">Recent Reviews</div>
          <div className="rp-subtitle">Latest code reviews across all users</div>
        </div>
        <div className="rp-count-pill">
          Showing <strong>{filtered.length}</strong> / {reviews.length}
        </div>
      </div>

      {/* Filters */}
      <div className="rp-filters anim a2">
        <div className="rp-search-wrap">
          <input
            className="rp-search"
            placeholder="Search user, language, summary…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="rp-search-icon">⌕</span>
        </div>
        <select className="rp-select" value={langFilter} onChange={e => setLang(e.target.value)}>
          {langs.map(l => <option key={l} value={l}>{l === 'all' ? 'All Languages' : l}</option>)}
        </select>
        <select className="rp-select" value={qualFilter} onChange={e => setQual(e.target.value)}>
          <option value="all">All Quality</option>
          <option value="excellent">Excellent (9+)</option>
          <option value="great">Great (8–9)</option>
          <option value="good">Good (6–8)</option>
          <option value="poor">Poor (&lt;6)</option>
        </select>
      </div>

      {/* Table */}
      <div className="rp-card anim a3">
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('user_name')} className={sortKey === 'user_name' ? 'sorted' : ''}>
                  User <SortIcon k="user_name" />
                </th>
                <th onClick={() => toggleSort('language')} className={sortKey === 'language' ? 'sorted' : ''}>
                  Language <SortIcon k="language" />
                </th>
                <th onClick={() => toggleSort('overall_score')} className={sortKey === 'overall_score' ? 'sorted' : ''}>
                  Score <SortIcon k="overall_score" />
                </th>
                <th>Quality</th>
                <th>Summary</th>
                <th onClick={() => toggleSort('created_at')} className={sortKey === 'created_at' ? 'sorted' : ''}>
                  Date <SortIcon k="created_at" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? <Skel /> : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="rp-empty">
                      <div className="rp-empty-icon">◐</div>
                      {search || langFilter !== 'all' || qualFilter !== 'all'
                        ? 'No reviews match your filters'
                        : 'No reviews found'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(r => {
                const sc = scoreColor(r.overall_score)
                const [label, lc] = scoreLabel(r.overall_score)
                return (
                  <tr key={r.id}>
                    <td><span className="rp-user">{r.user_name}</span></td>
                    <td><span className="rp-lang">{r.language}</span></td>
                    <td>
                      <div className="rp-score-cell">
                        <span className="rp-score-num" style={{ color: sc }}>
                          {r.overall_score?.toFixed(1)}
                        </span>
                        <div className="rp-score-track">
                          <div
                            className="rp-score-fill"
                            style={{ width: `${(r.overall_score / 10) * 100}%`, background: sc }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="rp-quality"
                        style={{ '--qcolor': lc, '--qbg': `${lc}1a`, '--qborder': `${lc}44` }}
                      >
                        {label}
                      </span>
                    </td>
                    <td>
                      <div className="rp-summary" title={r.summary || ''}>
                        {r.summary || <span style={{ color: T.dim }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <span className="rp-date">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="rp-footer">
            <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            <span>
              Avg score:{' '}
              <strong style={{ color: T.cyan, fontFamily: "'JetBrains Mono'" }}>
                {(filtered.reduce((s, r) => s + (r.overall_score || 0), 0) / filtered.length).toFixed(2)}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}