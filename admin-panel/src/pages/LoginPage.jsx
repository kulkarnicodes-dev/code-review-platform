import { useState } from 'react'
import { useAuth } from '../App'
import { useNavigate } from 'react-router-dom'

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

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap');

  .lp-root {
    --font-head: 'Syne', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    background: ${T.bg};
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  }

  /* ── Background grid ── */
  .lp-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(${T.border}55 1px, transparent 1px),
      linear-gradient(90deg, ${T.border}55 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%);
    pointer-events: none;
  }

  /* ── Glow orbs ── */
  .lp-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(80px);
  }
  .lp-orb-1 {
    width: 400px; height: 400px;
    top: -120px; left: -100px;
    background: ${T.violet};
    opacity: .07;
  }
  .lp-orb-2 {
    width: 300px; height: 300px;
    bottom: -80px; right: -80px;
    background: ${T.cyan};
    opacity: .06;
  }

  /* ── Card ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lp-card {
    width: 100%;
    max-width: 400px;
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 20px;
    padding: 40px;
    position: relative;
    z-index: 1;
    animation: fadeUp .5s ease forwards;
    box-shadow: 0 32px 80px #00000060, 0 0 0 1px ${T.border};
  }

  /* ── Logo mark ── */
  .lp-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32px;
  }
  .lp-logo-hex {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, ${T.cyan}22, ${T.violet}22);
    border: 1px solid ${T.borderHi};
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    position: relative;
  }
  .lp-logo-hex::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 14px;
    background: linear-gradient(135deg, ${T.cyan}44, ${T.violet}44);
    z-index: -1;
    opacity: 0;
    transition: opacity .2s;
  }

  /* ── Heading ── */
  .lp-eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: ${T.cyan};
    text-align: center;
    margin-bottom: 8px;
  }
  .lp-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -.02em;
    color: ${T.text};
    text-align: center;
    line-height: 1.1;
    margin-bottom: 6px;
  }
  .lp-subtitle {
    font-family: var(--font-mono);
    font-size: 11px;
    color: ${T.muted};
    text-align: center;
    margin-bottom: 32px;
  }

  /* ── Divider ── */
  .lp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, ${T.border}, transparent);
    margin-bottom: 28px;
  }

  /* ── Form ── */
  .lp-field { margin-bottom: 18px; }
  .lp-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: ${T.muted};
    margin-bottom: 8px;
  }
  .lp-input-wrap { position: relative; }
  .lp-input-icon {
    position: absolute;
    left: 13px; top: 50%;
    transform: translateY(-50%);
    color: ${T.dim};
    font-size: 13px;
    pointer-events: none;
    transition: color .2s;
  }
  .lp-input {
    width: 100%;
    background: ${T.elevated};
    border: 1px solid ${T.border};
    border-radius: 10px;
    padding: 11px 14px 11px 38px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: ${T.text};
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    box-sizing: border-box;
  }
  .lp-input::placeholder { color: ${T.dim}; }
  .lp-input:focus {
    border-color: ${T.cyan}88;
    box-shadow: 0 0 0 3px ${T.cyan}12;
  }
  .lp-input:focus + .lp-input-icon,
  .lp-input-wrap:focus-within .lp-input-icon { color: ${T.cyan}; }

  /* ── Error ── */
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60% { transform: translateX(-4px); }
    40%,80% { transform: translateX(4px); }
  }
  .lp-error {
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${T.red}0d;
    border: 1px solid ${T.red}33;
    border-radius: 8px;
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: ${T.red};
    margin-bottom: 18px;
    animation: shake .35s ease;
  }

  /* ── Submit button ── */
  .lp-btn {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, ${T.cyan}22, ${T.violet}22);
    border: 1px solid ${T.cyan}55;
    border-radius: 10px;
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: ${T.cyan};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: .02em;
    transition: all .2s;
    position: relative;
    overflow: hidden;
  }
  .lp-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, ${T.cyan}18, ${T.violet}18);
    opacity: 0;
    transition: opacity .2s;
  }
  .lp-btn:hover:not(:disabled)::before { opacity: 1; }
  .lp-btn:hover:not(:disabled) {
    border-color: ${T.cyan}99;
    box-shadow: 0 0 20px ${T.cyan}20;
    transform: translateY(-1px);
  }
  .lp-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-btn:disabled { opacity: .45; cursor: not-allowed; }
  .lp-btn-text { position: relative; }

  /* ── Spinner ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  .lp-spinner {
    width: 14px; height: 14px;
    border: 2px solid ${T.cyan}44;
    border-top-color: ${T.cyan};
    border-radius: 50%;
    animation: spin .7s linear infinite;
    position: relative;
  }

  /* ── Admin notice ── */
  .lp-notice {
    margin-top: 20px;
    background: ${T.elevated};
    border: 1px solid ${T.border};
    border-left: 3px solid ${T.amber};
    border-radius: 10px;
    padding: 14px 16px;
  }
  .lp-notice-head {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: ${T.amber};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lp-notice-body {
    font-family: var(--font-mono);
    font-size: 11px;
    color: ${T.muted};
    line-height: 1.6;
  }
  .lp-code {
    display: block;
    margin-top: 8px;
    padding: 8px 10px;
    background: ${T.bg};
    border: 1px solid ${T.border};
    border-radius: 6px;
    font-size: 10px;
    color: ${T.cyan};
    overflow-x: auto;
    white-space: nowrap;
  }

  /* ── Scrollbar ── */
  .lp-root ::-webkit-scrollbar { width: 4px; }
  .lp-root ::-webkit-scrollbar-track { background: ${T.surface}; }
  .lp-root ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
`

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }    = useAuth()
  const navigate     = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-root">
      <style>{STYLES}</style>

      {/* Background effects */}
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />

      <div className="lp-card">
        {/* Logo */}
        <div className="lp-logo">
          <div className="lp-logo-hex">⬡</div>
        </div>

        {/* Heading */}
        <div className="lp-eyebrow">Admin Console</div>
        <div className="lp-title">Welcome back</div>
        <div className="lp-subtitle">Sign in with your administrator account</div>
        <div className="lp-divider" />

        {/* Form — no HTML form tag, using button onClick */}
        <div className="lp-field">
          <label className="lp-label">Email address</label>
          <div className="lp-input-wrap">
            <input
              type="email"
              className="lp-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            />
            <span className="lp-input-icon">✉</span>
          </div>
        </div>

        <div className="lp-field">
          <label className="lp-label">Password</label>
          <div className="lp-input-wrap">
            <input
              type="password"
              className="lp-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            />
            <span className="lp-input-icon">🔑</span>
          </div>
        </div>

        {error && (
          <div className="lp-error">
            <span>⚠</span>
            {error}
          </div>
        )}

        <button className="lp-btn" onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><div className="lp-spinner" /><span className="lp-btn-text">Signing in…</span></>
            : <span className="lp-btn-text">Sign In →</span>
          }
        </button>

        {/* Admin notice */}
        <div className="lp-notice">
          <div className="lp-notice-head">
            <span>⚠</span> Admin Access Required
          </div>
          <div className="lp-notice-body">
            Your account must have the <strong style={{ color: T.cyan, fontFamily: "'JetBrains Mono'" }}>admin</strong> role assigned.
            Grant access via MongoDB:
            <code className="lp-code">
              {`db.users.updateOne({email}, {$set: {role: "admin"}})`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}