import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../utils/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Nav Links Config ───────────────────────────────────────────── */
const NAV_LINKS = [
  { path: '/dashboard',    label: 'Dashboard',  icon: '📊' },
  { path: '/review',       label: 'Review Code', icon: '🔍' },
  { path: '/history',      label: 'History',    icon: '📝' },
  { path: '/analytics',    label: 'Analytics',  icon: '📈' },
];

const FEATURE_LINKS = [
  { path: '/gamification', label: 'My Progress', icon: '🏆', color: 'amber',  activeClass: 'bg-amber-500 text-white',   hoverClass: 'text-amber-400 hover:bg-amber-500/10',   badge: null },
  { path: '/mentor',       label: 'AI Mentor',   icon: '🎓', color: 'violet', activeClass: 'bg-violet-600 text-white',  hoverClass: 'text-violet-400 hover:bg-violet-500/10', badge: 'NEW' },
  { path: '/github',       label: 'GitHub',      icon: '🐙', color: 'emerald', activeClass: 'bg-emerald-600 text-white', hoverClass: 'text-emerald-400 hover:bg-emerald-500/10', badge: null },
];

const ALL_LINKS = [...NAV_LINKS, ...FEATURE_LINKS];

/* ─── Command Palette ────────────────────────────────────────────── */
function CommandPalette({ open, onClose, navigate }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const actions = [
    ...ALL_LINKS.map(l => ({ ...l, type: 'nav', desc: `Go to ${l.label}` })),
    { label: 'Logout',       icon: '🚪', type: 'action', actionId: 'logout', desc: 'Sign out of your account' },
    { label: 'Toggle Theme', icon: '🌙', type: 'action', actionId: 'theme',  desc: 'Switch color theme' },
  ];

  const filtered = query.trim()
    ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.desc?.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const [selected, setSelected] = useState(0);

  useEffect(() => { if (open) { setQuery(''); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => { setSelected(0); }, [query]);

  const run = useCallback((action) => {
    if (action.type === 'nav') { navigate(action.path); onClose(); }
    if (action.actionId === 'logout') { onClose(); }
  }, [navigate, onClose]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => (i + 1) % filtered.length); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(i => (i - 1 + filtered.length) % filtered.length); }
    if (e.key === 'Enter')     { if (filtered[selected]) run(filtered[selected]); }
    if (e.key === 'Escape')    { onClose(); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: -10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#0d1424', border: '1px solid #1e293b' }}
        >
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search pages, actions…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 15, fontFamily: "'Outfit',sans-serif" }}
            />
            <kbd style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '2px 7px', fontSize: 11, color: '#64748b' }}>ESC</kbd>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#475569', fontSize: 13 }}>No results for "{query}"</div>
            )}
            {filtered.map((action, i) => (
              <button key={action.label} onClick={() => run(action)} onMouseEnter={() => setSelected(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: i === selected ? '#1e293b' : 'transparent',
                  border: 'none', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Outfit',sans-serif",
                  borderLeft: i === selected ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{action.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: i === selected ? '#e2e8f0' : '#94a3b8' }}>{action.label}</div>
                  {action.desc && <div style={{ fontSize: 11, color: '#475569' }}>{action.desc}</div>}
                </div>
                {action.badge && (
                  <span style={{ background: '#7c3aed', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>{action.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1e293b', display: 'flex', gap: 16, fontSize: 11, color: '#334155' }}>
            <span>↑↓ navigate</span><span>↵ select</span><span>ESC close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Notification Bell ──────────────────────────────────────────── */
const MOCK_NOTIFS = [
  { id: 1, icon: '🎉', title: 'Level Up!', body: 'You reached Intermediate level', time: '2m ago', unread: true },
  { id: 2, icon: '🔍', title: 'Review Complete', body: 'Your Python code was analyzed', time: '1h ago', unread: true },
  { id: 3, icon: '🏆', title: 'Badge Earned', body: 'First Security Fix badge unlocked', time: '3h ago', unread: false },
];

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const ref = useRef(null);
  const unreadCount = notifs.filter(n => n.unread).length;

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, unread: false })));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          position: 'relative', background: 'transparent', border: '1px solid #1e293b',
          borderRadius: 10, padding: '7px 9px', cursor: 'pointer', transition: 'all 0.15s',
          color: open ? '#e2e8f0' : '#94a3b8',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid #080d18' }} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 320, background: '#0d1424', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px #00000066', zIndex: 99 }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>Mark all read</button>
              )}
            </div>
            {notifs.map(n => (
              <div key={n.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: n.unread ? '#0a1020' : 'transparent', borderBottom: '1px solid #0f172a', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={e => e.currentTarget.style.background = n.unread ? '#0a1020' : 'transparent'}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{n.body}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#334155' }}>{n.time}</span>
                  {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }} />}
                </div>
              </div>
            ))}
            {notifs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#475569', fontSize: 13 }}>All caught up! 🎉</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Active Route Pill ──────────────────────────────────────────── */
function NavLink({ link, isActive, featureLink }) {
  const colorMap = {
    amber:   { active: '#d97706', hover: '#fbbf24' },
    violet:  { active: '#7c3aed', hover: '#a78bfa' },
    emerald: { active: '#059669', hover: '#34d399' },
  };
  const colors = colorMap[link.color] || {};

  const activeStyle = featureLink
    ? { background: colors.active, color: '#fff' }
    : { background: '#3b82f6', color: '#fff' };
  const hoverColor = featureLink ? colors.hover : '#93c5fd';

  return (
    <Link
      to={link.path}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 13px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600,
        transition: 'all 0.18s', fontFamily: "'Outfit',sans-serif",
        ...(isActive ? activeStyle : { color: '#94a3b8', background: 'transparent' }),
      }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = hoverColor; e.currentTarget.style.background = '#1e293b'; } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; } }}
    >
      <span style={{ fontSize: 14 }}>{link.icon}</span>
      <span>{link.label}</span>
      {link.badge && (
        <span style={{ fontSize: 9, fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '2px 5px', borderRadius: 99, letterSpacing: '0.05em' }}>
          {link.badge}
        </span>
      )}
    </Link>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────────── */
function Avatar({ name, size = 32 }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  const hue = (name?.charCodeAt(0) || 0) * 7 % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${hue},60%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: "'Outfit',sans-serif" }}>
      {initials}
    </div>
  );
}

/* ─── Main Navbar ────────────────────────────────────────────────── */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [cmdOpen,        setCmdOpen]        = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [prevPath,       setPrevPath]       = useState(location.pathname);

  const userMenuRef = useRef(null);

  /* scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* close menus on route change */
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setPrevPath(location.pathname);
  }, [location.pathname]);

  /* click outside user menu */
  useEffect(() => {
    const fn = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* global keyboard shortcut: Cmd/Ctrl + K → command palette only */
  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(p => !p); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  /* feature link color helpers */
  const featureLinkColor = (link) => ({
    amber:   { text: '#fbbf24', activeBg: '#92400e', hoverBg: 'rgba(245,158,11,0.1)' },
    violet:  { text: '#a78bfa', activeBg: '#4c1d95', hoverBg: 'rgba(124,58,237,0.1)' },
    emerald: { text: '#34d399', activeBg: '#064e3b', hoverBg: 'rgba(16,185,129,0.1)' },
  }[link.color] || { text: '#94a3b8', activeBg: '#1e293b', hoverBg: '#1e293b' });

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} navigate={navigate} />

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: scrolled ? 'rgba(5,8,16,0.92)' : '#080d18',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid #1e293b',
          padding: scrolled ? '10px 0' : '14px 0',
          transition: 'padding 0.25s, background 0.25s',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* ── Logo ── */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 8 }}>
            <motion.div
              whileHover={{ scale: 1.08, rotate: 4 }}
              style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width={22} height={22} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </motion.div>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit',sans-serif", background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CodeLens
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          {isAuthenticated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {NAV_LINKS.map(link => (
                <NavLink key={link.path} link={link} isActive={isActive(link.path)} featureLink={false} />
              ))}
              <div style={{ width: 1, height: 20, background: '#1e293b', margin: '0 6px', flexShrink: 0 }} />
              {FEATURE_LINKS.map(link => (
                <NavLink key={link.path} link={link} isActive={isActive(link.path)} featureLink={true} />
              ))}
            </div>
          )}

          {/* ── Right side ── */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>

            {isAuthenticated ? (
              <>
                {/* Command palette trigger */}
                <button
                  onClick={() => setCmdOpen(true)}
                  title="Command Palette (⌘K)"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                    background: 'transparent', border: '1px solid #1e293b', borderRadius: 10,
                    cursor: 'pointer', color: '#64748b', fontSize: 12, fontFamily: "'Outfit',sans-serif",
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <span className="hidden sm:inline">Search</span>
                </button>

                {/* Notifications */}
                <NotificationBell />

                {/* User dropdown */}
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setUserMenuOpen(p => !p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      background: userMenuOpen ? '#1e293b' : 'transparent',
                      border: '1px solid', borderColor: userMenuOpen ? '#334155' : '#1e293b',
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                    onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={user?.name} size={28} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit',sans-serif" }}>
                      {user?.name || 'User'}
                    </span>
                    <motion.svg
                      animate={{ rotate: userMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}
                      width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 240, background: '#0d1424', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px #00000066', zIndex: 99 }}
                      >
                        {/* User info */}
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Avatar name={user?.name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit',sans-serif" }}>{user?.name || 'User'}</div>
                            <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'user@example.com'}</div>
                          </div>
                        </div>

                        {/* Nav links */}
                        <div style={{ padding: '8px' }}>
                          {NAV_LINKS.map(link => (
                            <Link key={link.path} to={link.path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, textDecoration: 'none', color: isActive(link.path) ? '#60a5fa' : '#94a3b8', background: isActive(link.path) ? '#1e3a5f' : 'transparent', transition: 'all 0.12s', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}
                              onMouseEnter={e => { if (!isActive(link.path)) e.currentTarget.style.background = '#1e293b'; }}
                              onMouseLeave={e => { if (!isActive(link.path)) e.currentTarget.style.background = 'transparent'; }}>
                              <span>{link.icon}</span><span style={{ flex: 1 }}>{link.label}</span>
                            </Link>
                          ))}

                          <div style={{ height: 1, background: '#1e293b', margin: '6px 0' }} />
                          <p style={{ padding: '2px 12px 4px', fontSize: 10, color: '#334155', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Outfit',sans-serif" }}>New Features</p>

                          {FEATURE_LINKS.map(link => {
                            const c = featureLinkColor(link);
                            return (
                              <Link key={link.path} to={link.path}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, textDecoration: 'none', color: c.text, background: isActive(link.path) ? c.activeBg : 'transparent', transition: 'all 0.12s', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}
                                onMouseEnter={e => { e.currentTarget.style.background = c.hoverBg; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isActive(link.path) ? c.activeBg : 'transparent'; }}>
                                <span>{link.icon}</span>
                                <span style={{ flex: 1 }}>{link.label}</span>
                                {link.badge && <span style={{ fontSize: 9, fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '2px 5px', borderRadius: 99 }}>{link.badge}</span>}
                              </Link>
                            );
                          })}
                        </div>

                        <div style={{ padding: '8px', borderTop: '1px solid #1e293b' }}>
                          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit',sans-serif", transition: 'all 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span>🚪</span><span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(p => !p)}
                  style={{ padding: 8, background: mobileMenuOpen ? '#1e293b' : 'transparent', border: '1px solid #1e293b', borderRadius: 9, cursor: 'pointer', color: '#94a3b8', display: 'none' }}
                  className="lg:hidden"
                  aria-label="Menu"
                >
                  <motion.svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <AnimatePresence mode="wait">
                      {mobileMenuOpen
                        ? <motion.path key="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        : <motion.path key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      }
                    </AnimatePresence>
                  </motion.svg>
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <Link to="/login" style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', fontFamily: "'Outfit',sans-serif" }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                  Login
                </Link>
                <Link to="/register" style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s', fontFamily: "'Outfit',sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {mobileMenuOpen && isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', borderTop: '1px solid #1e293b' }}
            >
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NAV_LINKS.map(link => (
                  <Link key={link.path} to={link.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, textDecoration: 'none', fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 14, background: isActive(link.path) ? '#1d4ed8' : 'transparent', color: isActive(link.path) ? '#fff' : '#94a3b8', transition: 'all 0.15s' }}>
                    <span>{link.icon}</span><span style={{ flex: 1 }}>{link.label}</span>
                  </Link>
                ))}

                <div style={{ height: 1, background: '#1e293b', margin: '4px 0' }} />
                <p style={{ padding: '2px 14px', fontSize: 10, color: '#334155', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Outfit',sans-serif" }}>New Features</p>

                {FEATURE_LINKS.map(link => {
                  const c = featureLinkColor(link);
                  return (
                    <Link key={link.path} to={link.path}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, textDecoration: 'none', fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 14, color: c.text, background: isActive(link.path) ? c.activeBg : 'transparent', transition: 'all 0.15s' }}>
                      <span>{link.icon}</span><span style={{ flex: 1 }}>{link.label}</span>
                      {link.badge && <span style={{ fontSize: 9, fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '2px 6px', borderRadius: 99 }}>{link.badge}</span>}
                    </Link>
                  );
                })}

                {/* Mobile user info */}
                <div style={{ marginTop: 8, padding: '12px 14px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={user?.name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: "'Outfit',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
                    <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
                  </div>
                  <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#f87171', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

export default Navbar;