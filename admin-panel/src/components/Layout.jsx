import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

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
}

const NAV = [
  { path: '/',             icon: DashIcon,   label: 'Dashboard',    section: 'main',     accent: T.cyan   },
  { path: '/analytics',   icon: AnalytIcon,  label: 'Analytics',    section: 'main',     accent: T.violet },
  { path: '/users',       icon: UsersIcon,   label: 'Users',        section: 'main',     accent: T.green  },
  { path: '/reviews',     icon: ReviewsIcon, label: 'Reviews',      section: 'main',     accent: T.amber  },
  { path: '/gamification',icon: GameIcon,    label: 'Gamification', section: 'features', accent: T.red    },
]

/* ─── SVG Icons ──────────────────────────────────────────────────────── */
function DashIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function AnalytIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function UsersIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function ReviewsIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  )
}
function GameIcon({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
function SignOutIcon({ color }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .al-root {
    display: flex;
    min-height: 100vh;
    background: ${T.bg};
    font-family: 'Syne', sans-serif;
  }

  /* ── Sidebar ── */
  .al-sidebar {
    width: 224px;
    flex-shrink: 0;
    background: ${T.surface};
    border-right: 1px solid ${T.border};
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 50;
    transition: transform .25s cubic-bezier(.4,0,.2,1);
  }

  /* ── Logo ── */
  .al-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .al-logo-mark {
    width: 34px; height: 34px;
    border-radius: 10px;
    background: linear-gradient(135deg, ${T.cyan}22, ${T.violet}22);
    border: 1px solid ${T.borderHi};
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .al-logo-text {
    font-size: 14px; font-weight: 800;
    letter-spacing: -.01em;
    color: ${T.text};
    line-height: 1.1;
  }
  .al-logo-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; letter-spacing: .1em;
    text-transform: uppercase;
    color: ${T.muted};
    margin-top: 2px;
  }

  /* ── Nav ── */
  .al-nav {
    flex: 1;
    overflow-y: auto;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .al-nav::-webkit-scrollbar { width: 4px; }
  .al-nav::-webkit-scrollbar-track { background: transparent; }
  .al-nav::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }

  .al-section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; letter-spacing: .16em;
    text-transform: uppercase;
    color: ${T.dim};
    padding: 0 8px;
    margin-top: 8px;
    margin-bottom: 4px;
  }
  .al-section-label:first-child { margin-top: 0; }

  .al-nav-item {
    width: 100%;
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 600;
    color: ${T.muted};
    cursor: pointer; text-align: left;
    position: relative;
    transition: background .15s, color .15s, border-color .15s;
  }
  .al-nav-item:hover {
    background: ${T.elevated};
    color: ${T.text};
    border-color: ${T.border};
  }
  .al-nav-item.active {
    background: var(--na)18;
    color: var(--na);
    border-color: var(--na)33;
  }
  .al-nav-item.active .al-nav-dot { background: var(--na); box-shadow: 0 0 6px var(--na); }
  .al-nav-icon {
    width: 28px; height: 28px;
    border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: ${T.elevated};
    border: 1px solid ${T.border};
    flex-shrink: 0;
    transition: background .15s, border-color .15s;
  }
  .al-nav-item.active .al-nav-icon {
    background: var(--na)18;
    border-color: var(--na)44;
  }
  .al-nav-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: ${T.dim}; margin-left: auto; flex-shrink: 0;
    transition: background .15s, box-shadow .15s;
  }

  /* ── Divider ── */
  .al-nav-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, ${T.border}, transparent);
    margin: 8px 0;
  }

  /* ── User footer ── */
  .al-user {
    padding: 14px 14px 18px;
    border-top: 1px solid ${T.border};
  }
  .al-user-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px;
    border-radius: 10px;
    background: ${T.elevated};
    border: 1px solid ${T.border};
    margin-bottom: 10px;
    cursor: default;
  }
  .al-avatar {
    width: 32px; height: 32px; border-radius: 9px;
    background: ${T.violet}22; border: 1px solid ${T.violet}44;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: ${T.violet};
    overflow: hidden; flex-shrink: 0;
  }
  .al-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .al-user-name { font-size: 12px; font-weight: 700; color: ${T.text}; }
  .al-user-role {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
    color: ${T.cyan}; margin-top: 1px;
  }
  .al-signout {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid ${T.border};
    background: transparent;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; letter-spacing: .06em;
    color: ${T.muted};
    cursor: pointer;
    transition: all .15s;
  }
  .al-signout:hover { border-color: ${T.red}55; color: ${T.red}; background: ${T.red}0a; }

  /* ── Main ── */
  .al-main {
    flex: 1;
    margin-left: 224px;
    min-height: 100vh;
    overflow-y: auto;
  }

  /* ── Mobile hamburger ── */
  @media (max-width: 768px) {
    .al-sidebar { transform: translateX(-100%); }
    .al-sidebar.open { transform: translateX(0); box-shadow: 4px 0 40px #000000aa; }
    .al-main { margin-left: 0; }
    .al-hamburger {
      display: flex; position: fixed;
      top: 16px; left: 16px; z-index: 60;
    }
  }
  @media (min-width: 769px) { .al-hamburger { display: none; } }
  .al-hamburger {
    width: 36px; height: 36px; border-radius: 8px;
    background: ${T.surface}; border: 1px solid ${T.border};
    align-items: center; justify-content: center;
    cursor: pointer; flex-direction: column; gap: 4px;
  }
  .al-hamburger span {
    display: block; width: 16px; height: 1.5px;
    background: ${T.muted}; border-radius: 1px;
    transition: all .2s;
  }
  .al-overlay {
    display: none;
    position: fixed; inset: 0; z-index: 45;
    background: #00000066;
  }
  .al-overlay.open { display: block; }
`

/* ─── Main component ─────────────────────────────────────────────────── */
export default function Layout() {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const go = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const mainItems    = NAV.filter(i => i.section === 'main')
  const featureItems = NAV.filter(i => i.section === 'features')

  return (
    <div className="al-root">
      <style>{STYLES}</style>

      {/* Mobile hamburger */}
      <button className="al-hamburger" onClick={() => setMobileOpen(o => !o)}>
        <span /><span /><span />
      </button>

      {/* Mobile overlay */}
      <div className={`al-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* Sidebar */}
      <aside className={`al-sidebar${mobileOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="al-logo">
          <div className="al-logo-mark">⬡</div>
          <div>
            <div className="al-logo-text">CodeReview</div>
            <div className="al-logo-sub">Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="al-nav">
          <div className="al-section-label">Navigation</div>
          {mainItems.map(item => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button
                key={item.path}
                className={`al-nav-item${active ? ' active' : ''}`}
                style={{ '--na': item.accent }}
                onClick={() => go(item.path)}
              >
                <span className="al-nav-icon">
                  <Icon color={active ? item.accent : T.muted} />
                </span>
                {item.label}
                <span className="al-nav-dot" />
              </button>
            )
          })}

          <div className="al-nav-divider" />

          <div className="al-section-label">Features</div>
          {featureItems.map(item => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button
                key={item.path}
                className={`al-nav-item${active ? ' active' : ''}`}
                style={{ '--na': item.accent }}
                onClick={() => go(item.path)}
              >
                <span className="al-nav-icon">
                  <Icon color={active ? item.accent : T.muted} />
                </span>
                {item.label}
                <span className="al-nav-dot" />
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="al-user">
          <div className="al-user-row">
            <div className="al-avatar">
              {user?.profile_pic
                ? <img src={user.profile_pic} alt="" />
                : user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="al-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Admin'}
              </div>
              <div className="al-user-role">Administrator</div>
            </div>
          </div>
          <button className="al-signout" onClick={logout}>
            <SignOutIcon color="currentColor" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="al-main">
        <Outlet />
      </main>
    </div>
  )
}