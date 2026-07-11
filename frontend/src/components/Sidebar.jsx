import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import { gamificationAPI, reviewAPI } from '../services/api';

/* ─── Config ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { name: 'Dashboard',   path: '/dashboard',   icon: '📊', badge: null    },
  { name: 'Review Code', path: '/review',      icon: '🔍', badge: null    },
  { name: 'History',     path: '/history',     icon: '📜', badge: 'total' },
  { name: 'Analytics',   path: '/analytics',   icon: '📈', badge: null    },
  { name: 'GitHub',      path: '/github',      icon: '🐙', badge: null    },

  
];

const FEATURE_ITEMS = [
  { name: 'My Progress', path: '/gamification', icon: '🏆', badge: 'level', color: '#f59e0b', glow: '#f59e0b18' },
  { name: 'AI Mentor',   path: '/mentor',       icon: '🎓', badge: 'NEW',   color: '#8b5cf6', glow: '#8b5cf618' },
];

const PRO_TIPS = [
  "Review code daily to build strong habits and earn streak bonuses! 🚀",
  "Use the AI Mentor to get personalised feedback based on your skill level 🎓",
  "Focus on Security reviews to earn the 🛡️ Security Expert badge faster",
  "Submit 5 reviews in one day to unlock the ⚡ Speed Reviewer badge",
  "Try different languages to unlock the 🌍 Polyglot badge",
];

const XP_LEVELS = [
  { level: 1,  label: 'Beginner',     xpRequired: 0,    color: '#64748b' },
  { level: 2,  label: 'Novice',       xpRequired: 100,  color: '#22c55e' },
  { level: 3,  label: 'Apprentice',   xpRequired: 300,  color: '#3b82f6' },
  { level: 4,  label: 'Developer',    xpRequired: 600,  color: '#8b5cf6' },
  { level: 5,  label: 'Intermediate', xpRequired: 1000, color: '#f59e0b' },
  { level: 6,  label: 'Advanced',     xpRequired: 1500, color: '#f97316' },
  { level: 7,  label: 'Expert',       xpRequired: 2200, color: '#ef4444' },
  { level: 8,  label: 'Senior',       xpRequired: 3000, color: '#ec4899' },
  { level: 9,  label: 'Master',       xpRequired: 4000, color: '#a855f7' },
  { level: 10, label: 'Grandmaster',  xpRequired: 5500, color: '#ffd700' },
];

const BADGE_META = {
  first_review:      { icon: '⭐', label: 'First Step',       desc: 'Complete your first review' },
  bug_hunter:        { icon: '🐛', label: 'Bug Hunter',        desc: 'Find bugs in 10 reviews' },
  clean_code_master: { icon: '✨', label: 'Clean Code Master', desc: 'Perfect style score 5 times' },
  refactoring_pro:   { icon: '🔧', label: 'Refactoring Pro',   desc: 'Submit 20 reviews' },
  polyglot:          { icon: '🌍', label: 'Polyglot',          desc: 'Use 5 different languages' },
  streak_master:     { icon: '🔥', label: 'Streak Master',     desc: '7-day review streak' },
  security_expert:   { icon: '🛡️', label: 'Security Expert',   desc: 'Find security issues in 5 reviews' },
  speed_reviewer:    { icon: '⚡', label: 'Speed Reviewer',    desc: '5 reviews in one day' },
  high_scorer:       { icon: '💎', label: 'High Scorer',       desc: 'Score 9.0+ on any review' },
  centurion:         { icon: '💯', label: 'Centurion',         desc: 'Complete 100 reviews' },
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
const getScoreColor = score => {
  const n = parseFloat(score);
  if (n >= 8) return '#22c55e';
  if (n >= 6) return '#f59e0b';
  return '#ef4444';
};

const getLevelInfo = xp => {
  let current = XP_LEVELS[0], next = XP_LEVELS[1];
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xpRequired) {
      current = XP_LEVELS[i];
      next    = XP_LEVELS[i + 1] || null;
      break;
    }
  }
  const progress = next
    ? ((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100
    : 100;
  return { current, next, progress: Math.min(100, progress) };
};

/* ─── Custom hook: live sidebar data ────────────────────────────────
   Fetches gamification + review stats from the real backend.
   Retries once on failure and exposes a manual refresh fn.
─────────────────────────────────────────────────────────────────── */
function useSidebarData() {
  const [gamification, setGamification] = useState(null);
  const [reviewStats,  setReviewStats]  = useState(null);
  const [loadingGam,   setLoadingGam]   = useState(true);
  const [loadingRev,   setLoadingRev]   = useState(true);
  const [errorGam,     setErrorGam]     = useState(null);
  const [errorRev,     setErrorRev]     = useState(null);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  /* ── Gamification ── */
  const fetchGamification = useCallback(async () => {
    if (!mounted.current) return;
    setLoadingGam(true);
    setErrorGam(null);
    try {
      const res = await gamificationAPI.getMyProfile();

      /* Normalise: backend returns either { data: {...} } or the object directly */
      const raw = res?.data ?? res;
      if (!mounted.current) return;

      // /gamification/summary returns badges_earned (int count), not an array.
      // The BadgeGrid needs IDs, so we store what we have and show count in collapsed view.
      setGamification({
        xp:             raw?.xp             ?? 0,
        level:          raw?.level          ?? 1,
        level_name:     raw?.level_name     ?? 'Beginner',
        current_streak: raw?.current_streak ?? raw?.streak ?? 0,
        badges:         Array.isArray(raw?.badges) ? raw.badges : [],
        badges_earned:  raw?.badges_earned  ?? 0,
        total_reviews:  raw?.total_reviews  ?? 0,
        certificate_issued: raw?.certificate_issued ?? false,
      });
    } catch (err) {
      if (!mounted.current) return;
      const msg = err?.response?.status === 401
        ? 'Session expired — please log in again'
        : err?.response?.status === 404
        ? 'Gamification endpoint not found'
        : 'Could not load progress data';
      setErrorGam(msg);
      console.error('[Sidebar] Gamification fetch failed:', err?.response?.status, err?.message);
    } finally {
      if (mounted.current) setLoadingGam(false);
    }
  }, []);

  /* ── Review stats ── */
  const fetchReviewStats = useCallback(async () => {
    if (!mounted.current) return;
    setLoadingRev(true);
    setErrorRev(null);
    try {
      let reviews = [];
      /* Support both method call and direct axios-style usage */
      const res     = await reviewAPI.getReviews();
      const raw     = res?.data ?? res;
      reviews       = Array.isArray(raw) ? raw
                    : Array.isArray(raw?.reviews) ? raw.reviews
                    : [];

      if (!mounted.current) return;

      if (reviews.length === 0) {
        setReviewStats(null);
        return;
      }

      const scores  = reviews.map(r => r?.scores?.overall_score ?? r?.overall_score ?? 0);
      const avg     = scores.reduce((a, b) => a + b, 0) / scores.length;
      const recent5 = scores.slice(0, 5);
      const recAvg  = recent5.reduce((a, b) => a + b, 0) / recent5.length;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const thisWeek = reviews.filter(r => {
        const d = r?.created_at ?? r?.createdAt;
        return d && new Date(d) >= weekAgo;
      }).length;

      setReviewStats({
        totalReviews: reviews.length,
        avgScore:     avg.toFixed(1),
        recentAvg:    recAvg.toFixed(1),
        thisWeek,
      });
    } catch (err) {
      if (!mounted.current) return;
      const msg = err?.response?.status === 401
        ? 'Session expired'
        : 'Could not load review stats';
      setErrorRev(msg);
      console.error('[Sidebar] Review stats fetch failed:', err?.response?.status, err?.message);
    } finally {
      if (mounted.current) setLoadingRev(false);
    }
  }, []);

  /* ── Auto-fetch on mount ── */
  useEffect(() => {
    fetchGamification();
    fetchReviewStats();
  }, [fetchGamification, fetchReviewStats]);

  /* ── Refresh every 60 s while tab is visible ── */
  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGamification();
        fetchReviewStats();
      }
    }, 60_000);
    return () => clearInterval(tick);
  }, [fetchGamification, fetchReviewStats]);

  const refresh = useCallback(() => {
    fetchGamification();
    fetchReviewStats();
  }, [fetchGamification, fetchReviewStats]);

  return { gamification, reviewStats, loadingGam, loadingRev, errorGam, errorRev, refresh };
}

/* ─── Skeleton ────────────────────────────────────────────────────── */
const Skeleton = ({ width = '100%', height = 14, radius = 6 }) => (
  <div style={{
    width, height, borderRadius: radius,
    background: 'linear-gradient(90deg,#1e293b 25%,#263348 50%,#1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
);

/* ─── Error pill ──────────────────────────────────────────────────── */
const ErrorPill = ({ msg, onRetry }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#1a0a0a', border: '1px solid #7f1d1d44',
    borderRadius: 8, padding: '7px 10px', gap: 8,
  }}>
    <span style={{ fontSize: 10, color: '#f87171', lineHeight: 1.4 }}>⚠ {msg}</span>
    <button onClick={onRetry} style={{
      background: '#7f1d1d44', border: 'none', borderRadius: 5,
      color: '#f87171', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '3px 7px',
    }}>Retry</button>
  </div>
);

/* ─── Stat row ────────────────────────────────────────────────────── */
const StatRow = ({ label, value, color, icon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
    </div>
    <span style={{ fontSize: 13, fontWeight: 800, color: color || '#60a5fa', fontFamily: 'monospace' }}>{value}</span>
  </div>
);

/* ─── XP bar ──────────────────────────────────────────────────────── */
const XPBar = ({ xp = 0, loading }) => {
  const { current, next, progress } = getLevelInfo(xp);
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <Skeleton height={13} width="60%" /><Skeleton height={6} radius={99} /><Skeleton height={10} width="45%" />
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: `${current.color}22`, border: `1.5px solid ${current.color}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: current.color, fontFamily: 'monospace',
          }}>{current.level}</div>
          <span style={{ fontSize: 12, fontWeight: 800, color: current.color }}>{current.label}</span>
        </div>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, fontFamily: 'monospace' }}>
          {xp.toLocaleString()} XP
        </span>
      </div>
      <div style={{ height: 6, background: '#1e293b', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{
            height: '100%', borderRadius: 99,
            background: next
              ? `linear-gradient(90deg,${current.color},${next.color})`
              : `linear-gradient(90deg,${current.color},#ffd700)`,
            boxShadow: `0 0 8px ${current.color}66`,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>{Math.round(progress)}%</span>
        {next
          ? <span style={{ fontSize: 10, color: '#334155' }}>
              {(next.xpRequired - xp).toLocaleString()} XP to{' '}
              <span style={{ color: next.color, fontWeight: 700 }}>{next.label}</span>
            </span>
          : <span style={{ fontSize: 10, color: '#ffd700', fontWeight: 700 }}>✦ MAX LEVEL ✦</span>
        }
      </div>
    </div>
  );
};

/* ─── Streak ──────────────────────────────────────────────────────── */
const StreakDisplay = ({ streak = 0, collapsed, loading }) => {
  const active = streak > 0;
  if (collapsed) return (
    <div title={`${streak}-day streak`} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '10px 4px',
      background: active ? '#1c0a0033' : '#0a0f1a',
      border: `1px solid ${active ? '#f59e0b44' : '#1e293b'}`,
      borderRadius: 10,
    }}>
      <span style={{ fontSize: 18, filter: active ? 'none' : 'grayscale(1)' }}>🔥</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: active ? '#f59e0b' : '#334155', fontFamily: 'monospace' }}>{streak}</span>
    </div>
  );
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 13px',
      background: active ? '#1c0a0033' : '#0a0f1a',
      border: `1px solid ${active ? '#f59e0b44' : '#1e293b'}`,
      borderRadius: 11,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{
          fontSize: 22, display: 'inline-block',
          filter: active ? 'none' : 'grayscale(1)',
          animation: active ? 'flickerFlame 1.5s ease infinite' : 'none',
        }}>🔥</span>
        <div>
          {loading
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Skeleton width={80} height={12} /><Skeleton width={60} height={10} /></div>
            : <>
                <div style={{ fontSize: 12, fontWeight: 800, color: active ? '#fbbf24' : '#475569' }}>
                  {streak}-Day Streak
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
                  {active ? 'Keep it going! 💪' : 'Start a streak today'}
                </div>
              </>
          }
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i < streak ? '#f59e0b' : '#1e293b',
            boxShadow: i < streak ? '0 0 6px #f59e0b88' : 'none',
            transition: 'all 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
};

/* ─── Badge grid ──────────────────────────────────────────────────── */
const BadgeGrid = ({ earnedBadgeIds = [], collapsed, loading }) => {
  const [showAll, setShowAll] = useState(false);
  const badgeList = Object.entries(BADGE_META).map(([id, meta]) => ({
    id, ...meta, earned: earnedBadgeIds.includes(id),
  }));
  const visible = showAll ? badgeList : badgeList.slice(0, 4);

  if (collapsed) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
      {badgeList.filter(b => b.earned).slice(0, 3).map(b => (
        <div key={b.id} title={b.label} style={{
          width: 36, height: 36, borderRadius: 9,
          background: '#0a1020', border: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{b.icon}</div>
      ))}
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {[...Array(6)].map((_, i) => <Skeleton key={i} width={36} height={36} radius={9} />)}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {visible.map(b => (
          <motion.div key={b.id} whileHover={b.earned ? { scale: 1.18 } : {}}
            title={`${b.label} — ${b.desc}`}
            style={{
              width: 36, height: 36, borderRadius: 9, fontSize: 17, cursor: 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: b.earned ? '#0f1929' : '#080d18',
              border: b.earned ? '1px solid #334155' : '1px dashed #1a2035',
              filter: b.earned ? 'none' : 'grayscale(1) opacity(0.25)',
            }}>{b.icon}</motion.div>
        ))}
        {badgeList.length > 4 && (
          <button onClick={() => setShowAll(p => !p)} style={{
            width: 36, height: 36, borderRadius: 9,
            background: '#0a1020', border: '1px solid #1e293b',
            color: '#475569', fontSize: 11, fontWeight: 800, cursor: 'pointer',
          }}>
            {showAll ? '−' : `+${badgeList.length - 4}`}
          </button>
        )}
      </div>
      <div style={{ marginTop: 7, fontSize: 10, color: '#334155' }}>
        {earnedBadgeIds.length}/{badgeList.length} earned
      </div>
    </div>
  );
};

/* ─── Gamification panel ──────────────────────────────────────────── */
const GamificationPanel = ({ gamification, loading, error, onRetry }) => (
  <div style={{
    background: 'linear-gradient(135deg,#1c1003,#0d1424)',
    border: '1px solid #854d0e44', borderRadius: 13,
    padding: '13px 14px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 50, opacity: 0.06 }}>🏆</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'linear-gradient(135deg,#d97706,#b45309)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>🏆</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>My Progress</div>
        {loading
          ? <Skeleton width={80} height={9} />
          : <div style={{ fontSize: 10, color: '#f59e0b' }}>
              Level {gamification?.level ?? 1} · {gamification?.level_name ?? 'Beginner'}
            </div>
        }
      </div>
    </div>

    {error
      ? <ErrorPill msg={error} onRetry={onRetry} />
      : <XPBar xp={gamification?.xp ?? 0} loading={loading} />
    }

    <Link to="/gamification" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      marginTop: 11, padding: '8px 0',
      background: 'linear-gradient(135deg,#d97706,#b45309)',
      borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700,
      textDecoration: 'none', transition: 'filter 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
    >
      View Full Progress
      <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  </div>
);

/* ─── AI Mentor panel ─────────────────────────────────────────────── */
const MentorPanel = () => (
  <div style={{
    background: 'linear-gradient(135deg,#1e0a3c,#0d1424)',
    border: '1px solid #4c1d9555', borderRadius: 13,
    padding: '13px 14px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 50, opacity: 0.06 }}>🎓</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>🎓</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>AI Mentor</div>
        <div style={{ fontSize: 10, color: '#7c3aed' }}>Personalised coaching</div>
      </div>
      <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '2px 6px', borderRadius: 99 }}>NEW</span>
    </div>
    <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.55, marginBottom: 10 }}>
      Get feedback tailored to your level — Beginner to Expert.
    </p>
    <Link to="/mentor" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '8px 0',
      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700,
      textDecoration: 'none', transition: 'filter 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
    >
      Open Mentor
      <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  </div>
);

/* ─── Pro tip ─────────────────────────────────────────────────────── */
const ProTip = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % PRO_TIPS.length), 8000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{
      background: 'linear-gradient(135deg,#0a1e3c,#0d1424)',
      border: '1px solid #1e3a5f', borderRadius: 11, padding: '11px 13px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontSize: 13 }}>💡</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pro Tip</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
          {PRO_TIPS.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? 12 : 5, height: 5, borderRadius: 99,
              background: i === idx ? '#3b82f6' : '#1e293b',
              cursor: 'pointer', transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={idx}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          style={{ fontSize: 11, color: '#64748b', lineHeight: 1.55, margin: 0 }}>
          {PRO_TIPS[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/* ─── Section header ──────────────────────────────────────────────── */
const SectionHeader = ({ label, icon, onRefresh, loading }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
      <span style={{ fontSize: 10, fontWeight: 800, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
    </div>
    {onRefresh && (
      <button onClick={onRefresh} title="Refresh" style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#334155', padding: 2, display: 'flex', alignItems: 'center',
        borderRadius: 4, transition: 'color 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.color = '#334155'}
      >
        <motion.svg
          animate={{ rotate: loading ? 360 : 0 }}
          transition={loading ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
          width={13} height={13} fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </motion.svg>
      </button>
    )}
  </div>
);

/* ─── Main sidebar ────────────────────────────────────────────────── */
const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');
  const [isMobile,  setIsMobile]  = useState(false);

  const {
    gamification, reviewStats,
    loadingGam, loadingRev,
    errorGam, errorRev,
    refresh,
  } = useSidebarData();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isActive       = path => location.pathname === path;
  const xp             = gamification?.xp ?? 0;
  const streak         = gamification?.current_streak ?? 0;
  const earnedBadgeIds = gamification?.badges ?? [];

  if (isMobile) return null;

  return (
    <>
      <style>{`
        @keyframes flickerFlame {
          0%,100% { transform: scale(1) rotate(0deg); }
          25%      { transform: scale(1.06) rotate(-2deg); }
          75%      { transform: scale(0.97) rotate(2deg); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .sidebar-scroll::-webkit-scrollbar       { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
        .sidebar-nav-link:hover .sidebar-tooltip { opacity: 1 !important; }
      `}</style>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'fixed',
          left: collapsed ? 80 : 258,
          bottom: 24, zIndex: 60,
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg,#3b82f6,#7c3aed)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px #3b82f644',
          transition: 'left 0.3s ease',
        }}
      >
        <motion.svg
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          width={13} height={13} fill="none" viewBox="0 0 24 24"
          stroke="#fff" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </motion.svg>
      </button>

      {/* Sidebar */}
      <motion.aside
        className="sidebar-scroll"
        animate={{ width: collapsed ? 68 : 252 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          background: '#080d18',
          borderRight: '1px solid #1a2235',
          minHeight: 'calc(100vh - 73px)',
          padding: collapsed ? '18px 8px' : '18px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          position: 'sticky',
          top: 73,
          overflowY: 'auto',
          overflowX: 'hidden',
          flexShrink: 0,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
          {NAV_ITEMS.map(item => {
            const active   = isActive(item.path);
            const badgeVal = item.badge === 'total' ? reviewStats?.totalReviews : item.badge;
            return (
              <div key={item.path} className="sidebar-nav-link" style={{ position: 'relative' }}>
                <Link to={item.path} title={collapsed ? item.name : ''}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    padding: collapsed ? '10px 8px' : '10px 12px',
                    borderRadius: 11, textDecoration: 'none', position: 'relative',
                    background: active ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'transparent',
                    color: active ? '#fff' : '#64748b',
                    boxShadow: active ? '0 4px 16px #3b82f622' : 'none',
                    transition: 'all 0.18s',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#0f1929'; e.currentTarget.style.color = '#94a3b8'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
                >
                  {active && (
                    <motion.div layoutId="activeIndicator" style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 20, background: '#ffffff88', borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', flex: 1 }}>
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!collapsed && badgeVal != null && (
                    <span style={{ fontSize: 10, fontWeight: 800, background: '#1e3a5f', color: '#60a5fa', padding: '2px 7px', borderRadius: 99 }}>
                      {badgeVal}
                    </span>
                  )}
                </Link>
                {collapsed && (
                  <div className="sidebar-tooltip" style={{
                    position: 'absolute', left: 'calc(100% + 10px)', top: '50%',
                    transform: 'translateY(-50%)', padding: '6px 10px',
                    background: '#0d1424', border: '1px solid #1e293b',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#e2e8f0',
                    whiteSpace: 'nowrap', zIndex: 99,
                    boxShadow: '0 8px 24px #00000066',
                    opacity: 0, transition: 'opacity 0.15s', pointerEvents: 'none',
                  }}>{item.name}</div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ height: 1, background: '#1a2235', margin: '6px 0' }} />

        {/* Feature items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
          {!collapsed && (
            <span style={{ fontSize: 9, fontWeight: 800, color: '#1e293b', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 12px 4px' }}>
              Features
            </span>
          )}
          {FEATURE_ITEMS.map(item => {
            const active   = isActive(item.path);
            const badgeVal = item.badge === 'level'
              ? (gamification ? `LV.${gamification.level}` : null)
              : item.badge;
            return (
              <Link key={item.path} to={item.path} title={collapsed ? item.name : ''}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? '10px 8px' : '10px 12px',
                  borderRadius: 11, textDecoration: 'none', position: 'relative',
                  background: active ? item.glow : 'transparent',
                  border: active ? `1px solid ${item.color}44` : '1px solid transparent',
                  color: active ? item.color : '#64748b',
                  transition: 'all 0.18s',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = item.glow; e.currentTarget.style.color = item.color; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', flex: 1 }}>
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && badgeVal && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: `${item.color}22`, color: item.color, padding: '2px 6px', borderRadius: 99, border: `1px solid ${item.color}33` }}>
                    {badgeVal}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ height: 1, background: '#1a2235', margin: '6px 0' }} />

        {/* Collapsed mini view */}
        {collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <StreakDisplay streak={streak} collapsed loading={loadingGam} />
            {reviewStats && (
              <>
                <div title={`${reviewStats.totalReviews} total reviews`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 4px', background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 10, width: '100%' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>{reviewStats.totalReviews}</span>
                  <span style={{ fontSize: 10, color: '#334155' }}>📝</span>
                </div>
                <div title={`Avg score: ${reviewStats.avgScore}/10`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 4px', background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 10, width: '100%' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: getScoreColor(reviewStats.avgScore), fontFamily: 'monospace' }}>{reviewStats.avgScore}</span>
                  <span style={{ fontSize: 10, color: '#334155' }}>⭐</span>
                </div>
              </>
            )}
            <BadgeGrid earnedBadgeIds={earnedBadgeIds} collapsed loading={loadingGam} />
          </div>
        )}

        {/* Expanded view */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <StreakDisplay streak={streak} loading={loadingGam} />

              {/* Stats / Badges tabs */}
              <div>
                <div style={{ display: 'flex', background: '#0a0f1a', borderRadius: 9, padding: 3, marginBottom: 12, border: '1px solid #1a2235' }}>
                  {['stats', 'badges'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      flex: 1, padding: '6px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 700,
                      background: activeTab === tab ? '#1e293b' : 'transparent',
                      color: activeTab === tab ? '#e2e8f0' : '#475569',
                      textTransform: 'capitalize', transition: 'all 0.15s',
                    }}>{tab === 'stats' ? '📊 Stats' : '🏅 Badges'}</button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'stats' && (
                    <motion.div key="stats" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                      <SectionHeader label="Quick Stats" onRefresh={refresh} loading={loadingRev} />
                      {errorRev
                        ? <ErrorPill msg={errorRev} onRetry={refresh} />
                        : (
                          <div style={{ background: '#0a0f1a', border: '1px solid #1a2235', borderRadius: 11, padding: '2px 12px' }}>
                            {loadingRev ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
                                {[...Array(4)].map((_, i) => <Skeleton key={i} height={18} />)}
                              </div>
                            ) : reviewStats ? (
                              <>
                                <StatRow label="Total Reviews" value={reviewStats.totalReviews} icon="📝" />
                                <div style={{ height: 1, background: '#1a2235' }} />
                                <StatRow label="Avg Score"    value={`${reviewStats.avgScore}/10`} icon="⭐" color={getScoreColor(reviewStats.avgScore)} />
                                <div style={{ height: 1, background: '#1a2235' }} />
                                <StatRow label="This Week"    value={reviewStats.thisWeek} icon="📅" color="#a78bfa" />
                                <div style={{ height: 1, background: '#1a2235' }} />
                                <StatRow label="Recent Avg"   value={`${reviewStats.recentAvg}/10`} icon="📈" color={getScoreColor(reviewStats.recentAvg)} />
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <p style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>No reviews yet</p>
                                <Link to="/review" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>Start reviewing →</Link>
                              </div>
                            )}
                          </div>
                        )
                      }
                    </motion.div>
                  )}

                  {activeTab === 'badges' && (
                    <motion.div key="badges" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                      <SectionHeader label="Badges" icon="🏅" />
                      {errorGam
                        ? <ErrorPill msg={errorGam} onRetry={refresh} />
                        : <BadgeGrid earnedBadgeIds={earnedBadgeIds} loading={loadingGam} />
                      }
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <GamificationPanel
                gamification={gamification}
                loading={loadingGam}
                error={errorGam}
                onRetry={refresh}
              />
              <MentorPanel />
              <ProTip />

              <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#1e293b' }}>CodeReview AI v1.0</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
};

export default Sidebar;