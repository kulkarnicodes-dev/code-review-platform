import { useState, useEffect, useRef } from 'react'
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

const lvlColor = l => l >= 9 ? T.amber : l >= 7 ? T.violet : l >= 5 ? T.cyan : T.green

const ROLE_META = {
  admin:     { color: T.red,    label: 'Admin'     },
  moderator: { color: T.amber,  label: 'Moderator' },
  developer: { color: T.indigo, label: 'Developer' },
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  .up-root {
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
  .up-root .anim { opacity: 0; animation: fadeUp .45s ease forwards; }
  .up-root .a1 { animation-delay: .04s; }
  .up-root .a2 { animation-delay: .12s; }
  .up-root .a3 { animation-delay: .20s; }

  /* ── Header ── */
  .up-header {
    display: flex; justify-content: space-between;
    align-items: flex-end; margin-bottom: 28px;
  }
  .up-eyebrow {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: .18em; text-transform: uppercase;
    color: ${T.cyan}; margin-bottom: 6px;
  }
  .up-title { font-size: 32px; font-weight: 800; letter-spacing: -.02em; line-height: 1; }
  .up-subtitle { margin-top: 6px; font-family: var(--font-mono); font-size: 13px; color: ${T.muted}; }

  /* ── Search ── */
  .up-search-wrap { position: relative; width: 260px; }
  .up-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: ${T.dim}; font-size: 13px; pointer-events: none;
    transition: color .2s;
  }
  .up-search {
    width: 100%; background: ${T.elevated};
    border: 1px solid ${T.border}; border-radius: 10px;
    padding: 9px 14px 9px 36px;
    font-family: var(--font-mono); font-size: 12px;
    color: ${T.text}; outline: none;
    transition: border-color .2s, box-shadow .2s;
    box-sizing: border-box;
  }
  .up-search::placeholder { color: ${T.dim}; }
  .up-search:focus { border-color: ${T.cyan}88; box-shadow: 0 0 0 3px ${T.cyan}12; }
  .up-search:focus ~ .up-search-icon { color: ${T.cyan}; }

  /* ── Card ── */
  .up-card {
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: 16px; overflow: hidden;
    transition: border-color .2s;
  }

  /* ── Table ── */
  .up-table-wrap { overflow-x: auto; }
  .up-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .up-table th {
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: .14em; text-transform: uppercase;
    color: ${T.muted}; text-align: left;
    padding: 14px 16px; border-bottom: 1px solid ${T.border};
    white-space: nowrap; background: ${T.elevated};
  }
  .up-table td {
    padding: 13px 16px; border-bottom: 1px solid ${T.border}44;
    vertical-align: middle;
  }
  .up-table tbody tr { transition: background .15s, opacity .2s; }
  .up-table tbody tr:hover { background: ${T.elevated}; }
  .up-table tbody tr:last-child td { border-bottom: none; }
  .up-table tbody tr.busy { opacity: .45; pointer-events: none; }

  /* ── Avatar + user cell ── */
  .up-user-cell { display: flex; align-items: center; gap: 10px; }
  .up-avatar {
    width: 34px; height: 34px; border-radius: 10px;
    background: ${T.violet}22; border: 1px solid ${T.violet}44;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: ${T.violet};
    overflow: hidden; flex-shrink: 0;
  }
  .up-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .up-name { font-weight: 600; font-size: 13px; color: ${T.text}; }
  .up-email { font-family: var(--font-mono); font-size: 10px; color: ${T.muted}; margin-top: 1px; }

  /* ── Role selector ── */
  .up-role-wrap { position: relative; display: inline-flex; align-items: center; }
  .up-role-dot {
    width: 6px; height: 6px; border-radius: 50%;
    position: absolute; left: 10px; pointer-events: none;
    transition: background .2s;
  }
  .up-role-select {
    appearance: none;
    background: var(--rbg); border: 1px solid var(--rborder);
    border-radius: 7px; padding: 5px 26px 5px 22px;
    font-family: var(--font-mono); font-size: 10px;
    font-weight: 600; color: var(--rcolor);
    cursor: pointer; outline: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%234d6380'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: border-color .15s, box-shadow .15s;
  }
  .up-role-select:focus { box-shadow: 0 0 0 2px var(--rborder); }
  .up-role-select:hover { border-color: var(--rcolor)88; }

  /* ── Review count ── */
  .up-reviews {
    font-family: var(--font-mono); font-weight: 700;
    font-size: 14px; color: ${T.cyan};
  }

  /* ── Level / XP ── */
  .up-level-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: var(--font-mono); font-size: 10px;
    padding: 3px 8px; border-radius: 5px;
    background: var(--lc)22; border: 1px solid var(--lc)44;
    color: var(--lc); white-space: nowrap;
  }
  .up-xp { font-family: var(--font-mono); font-size: 10px; color: ${T.dim}; margin-top: 3px; }

  /* ── Date ── */
  .up-date { font-family: var(--font-mono); font-size: 10px; color: ${T.dim}; white-space: nowrap; }

  /* ── Delete button ── */
  .up-del {
    padding: 5px 12px; border-radius: 7px;
    border: 1px solid ${T.red}44;
    background: ${T.red}0d;
    font-family: var(--font-mono); font-size: 10px;
    font-weight: 600; color: ${T.red};
    cursor: pointer; transition: all .15s;
    white-space: nowrap;
  }
  .up-del:hover:not(:disabled) { background: ${T.red}22; border-color: ${T.red}88; }
  .up-del:disabled { opacity: .35; cursor: not-allowed; }

  /* ── Empty ── */
  .up-empty {
    text-align: center; padding: 60px 20px;
    font-family: var(--font-mono); font-size: 12px; color: ${T.dim};
  }
  .up-empty-icon { font-size: 28px; margin-bottom: 12px; opacity: .35; }

  /* ── Skeleton ── */
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .up-skel {
    border-radius: 6px;
    background: linear-gradient(90deg, ${T.elevated} 25%, ${T.border} 50%, ${T.elevated} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
  }

  /* ── Pagination ── */
  .up-pagination {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 20px; border-top: 1px solid ${T.border};
    background: ${T.elevated};
  }
  .up-page-info { font-family: var(--font-mono); font-size: 11px; color: ${T.muted}; }
  .up-page-info strong { color: ${T.text}; }
  .up-page-btns { display: flex; gap: 6px; align-items: center; }
  .up-page-btn {
    padding: 6px 14px; border-radius: 7px;
    border: 1px solid ${T.border}; background: transparent;
    font-family: var(--font-mono); font-size: 11px;
    color: ${T.muted}; cursor: pointer;
    transition: all .15s;
  }
  .up-page-btn:hover:not(:disabled) { border-color: ${T.borderHi}; color: ${T.text}; }
  .up-page-btn:disabled { opacity: .3; cursor: not-allowed; }
  .up-page-nums { display: flex; gap: 4px; }
  .up-page-num {
    width: 30px; height: 30px; border-radius: 6px;
    border: 1px solid ${T.border}; background: transparent;
    font-family: var(--font-mono); font-size: 11px;
    color: ${T.muted}; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all .15s;
  }
  .up-page-num:hover { border-color: ${T.borderHi}; color: ${T.text}; }
  .up-page-num.active {
    background: ${T.cyan}18; border-color: ${T.cyan}66;
    color: ${T.cyan}; font-weight: 700;
  }

  /* ── Confirm modal ── */
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(.95) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .up-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: #00000088; backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .up-modal {
    background: ${T.surface}; border: 1px solid ${T.borderHi};
    border-radius: 16px; padding: 32px; max-width: 380px; width: 100%;
    box-shadow: 0 32px 80px #00000080;
    animation: scaleIn .25s ease;
  }
  .up-modal-icon { font-size: 32px; margin-bottom: 16px; }
  .up-modal-title {
    font-size: 18px; font-weight: 800; letter-spacing: -.01em;
    margin-bottom: 8px;
  }
  .up-modal-body { font-family: var(--font-mono); font-size: 12px; color: ${T.muted}; line-height: 1.6; margin-bottom: 24px; }
  .up-modal-name { color: ${T.text}; font-weight: 700; }
  .up-modal-btns { display: flex; gap: 10px; }
  .up-modal-cancel {
    flex: 1; padding: 11px; border-radius: 9px;
    border: 1px solid ${T.border}; background: transparent;
    font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
    color: ${T.muted}; cursor: pointer; transition: all .15s;
  }
  .up-modal-cancel:hover { border-color: ${T.borderHi}; color: ${T.text}; }
  .up-modal-confirm {
    flex: 1; padding: 11px; border-radius: 9px;
    border: 1px solid ${T.red}55; background: ${T.red}18;
    font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
    color: ${T.red}; cursor: pointer; transition: all .15s;
  }
  .up-modal-confirm:hover { background: ${T.red}28; border-color: ${T.red}88; }

  /* ── Footer ── */
  .up-footer-bar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px; border-top: 1px solid ${T.border};
    background: ${T.elevated};
    font-family: var(--font-mono); font-size: 10px; color: ${T.dim};
  }

  /* ── Scrollbar ── */
  .up-root ::-webkit-scrollbar { width: 6px; height: 6px; }
  .up-root ::-webkit-scrollbar-track { background: ${T.surface}; }
  .up-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`

/* ─── Skeleton rows ─────────────────────────────────────────────────── */
const SkeletonRows = () => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <tr key={i}>
        <td>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="up-skel" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
            <div>
              <div className="up-skel" style={{ width: 100, height: 13, marginBottom: 5 }} />
              <div className="up-skel" style={{ width: 140, height: 10 }} />
            </div>
          </div>
        </td>
        {[60, 40, 60, 70, 80].map((w, j) => (
          <td key={j}><div className="up-skel" style={{ width: w, height: 14 }} /></td>
        ))}
      </tr>
    ))}
  </>
)

/* ─── Delete Confirm Modal ───────────────────────────────────────────── */
const DeleteModal = ({ user, onConfirm, onCancel }) => (
  <div className="up-overlay" onClick={onCancel}>
    <div className="up-modal" onClick={e => e.stopPropagation()}>
      <div className="up-modal-icon">⚠️</div>
      <div className="up-modal-title">Delete User</div>
      <div className="up-modal-body">
        This will permanently delete{' '}
        <span className="up-modal-name">{user.name}</span>{' '}
        and all their associated data — reviews, XP, badges, and sessions.
        <br /><br />
        This action <strong style={{ color: '#f43f5e' }}>cannot be undone</strong>.
      </div>
      <div className="up-modal-btns">
        <button className="up-modal-cancel" onClick={onCancel}>Cancel</button>
        <button className="up-modal-confirm" onClick={onConfirm}>Delete Permanently</button>
      </div>
    </div>
  </div>
)

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function UsersPage() {
  const [users, setUsers]               = useState([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [pages, setPages]               = useState(1)
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [search, setSearch]             = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAllUsers(page, 20)
      setUsers(res.data.users || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [page])

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId)
    try {
      await adminApi.updateUserRole(userId, newRole)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (e) {
      console.error('Failed to update role:', e.response?.data?.detail || e.message)
    }
    setActionLoading(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    setDeleteTarget(null)
    setActionLoading(id)
    try {
      await adminApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      setTotal(t => t - 1)
    } catch (e) {
      console.error('Failed to delete:', e.response?.data?.detail || e.message)
    }
    setActionLoading(null)
  }

  const filtered = search
    ? users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  /* Page number buttons — show up to 7 pages around current */
  const pageNums = Array.from({ length: pages }, (_, i) => i + 1).filter(n => {
    if (pages <= 7) return true
    if (n === 1 || n === pages) return true
    return Math.abs(n - page) <= 2
  })

  return (
    <div className="up-root">
      <style>{STYLES}</style>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="up-header anim a1">
        <div>
          <div className="up-eyebrow">Admin Console · Users</div>
          <div className="up-title">Users</div>
          <div className="up-subtitle">
            {total.toLocaleString()} registered user{total !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="up-search-wrap">
          <input
            className="up-search"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="up-search-icon">⌕</span>
        </div>
      </div>

      {/* Table card */}
      <div className="up-card anim a2">
        <div className="up-table-wrap">
          <table className="up-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Reviews</th>
                <th>Level / XP</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows /> : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="up-empty">
                      <div className="up-empty-icon">◎</div>
                      {search ? 'No users match your search' : 'No users found'}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(user => {
                const rm = ROLE_META[user.role] || ROLE_META.developer
                const lc = lvlColor(user.level)
                const busy = actionLoading === user.id
                return (
                  <tr key={user.id} className={busy ? 'busy' : ''}>
                    {/* User */}
                    <td>
                      <div className="up-user-cell">
                        <div className="up-avatar">
                          {user.profile_pic
                            ? <img src={user.profile_pic} alt="" />
                            : user.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="up-name">{user.name}</div>
                          <div className="up-email">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <div className="up-role-wrap" style={{
                        '--rcolor':  rm.color,
                        '--rbg':     `${rm.color}1a`,
                        '--rborder': `${rm.color}44`,
                      }}>
                        <div className="up-role-dot" style={{ background: rm.color }} />
                        <select
                          className="up-role-select"
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          disabled={busy}
                        >
                          <option value="developer">Developer</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>

                    {/* Reviews */}
                    <td>
                      <span className="up-reviews">{user.review_count}</span>
                    </td>

                    {/* Level / XP */}
                    <td>
                      <span className="up-level-badge" style={{ '--lc': lc }}>
                        Lv.{user.level}
                      </span>
                      <div className="up-xp">{user.xp?.toLocaleString()} XP</div>
                    </td>

                    {/* Joined */}
                    <td>
                      <span className="up-date">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        className="up-del"
                        onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="up-pagination anim a3">
            <span className="up-page-info">
              Page <strong>{page}</strong> of <strong>{pages}</strong>
              {' · '}{total.toLocaleString()} users
            </span>
            <div className="up-page-btns">
              <button className="up-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="up-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              <div className="up-page-nums">
                {pageNums.map((n, i, arr) => (
                  <>
                    {i > 0 && arr[i - 1] !== n - 1 && (
                      <span key={`gap-${n}`} style={{ padding: '0 4px', color: T.dim, lineHeight: '30px', fontFamily: "'JetBrains Mono'" }}>…</span>
                    )}
                    <button
                      key={n}
                      className={`up-page-num${page === n ? ' active' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  </>
                ))}
              </div>
              <button className="up-page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              <button className="up-page-btn" disabled={page === pages} onClick={() => setPage(pages)}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}