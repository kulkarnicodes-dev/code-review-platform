import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';
import { useAuthStore } from '../utils/store';

/* ─── Password Strength ──────────────────────────────────────────── */
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444', pct: 20  };
  if (score === 2) return { score, label: 'Fair',   color: '#f59e0b', pct: 40  };
  if (score === 3) return { score, label: 'Good',   color: '#3b82f6', pct: 65  };
  if (score === 4) return { score, label: 'Strong', color: '#22c55e', pct: 85  };
  return              { score, label: 'Excellent', color: '#8b5cf6', pct: 100 };
}

/* ─── Floating Label Input ───────────────────────────────────────── */
function FloatingInput({ id, label, type = 'text', value, onChange, icon, rightSlot, error, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div style={{ position: 'relative', marginBottom: 4 }}>
      {/* Icon */}
      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? '#3b82f6' : '#475569', transition: 'color 0.2s', zIndex: 2, pointerEvents: 'none' }}>
        {icon}
      </div>
      {/* Input */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        placeholder=" "
        style={{
          width: '100%', padding: '20px 44px 8px 44px',
          background: focused ? '#0d1830' : '#080d18',
          border: `1.5px solid ${error ? '#ef4444' : focused ? '#3b82f6' : '#1e293b'}`,
          borderRadius: 12, color: '#e2e8f0', fontSize: 14,
          fontFamily: "'Outfit',sans-serif", outline: 'none',
          transition: 'all 0.2s',
          boxShadow: focused ? `0 0 0 3px ${error ? '#ef444420' : '#3b82f620'}` : 'none',
        }}
      />
      {/* Floating label */}
      <label htmlFor={id} style={{
        position: 'absolute', left: 44, pointerEvents: 'none', transition: 'all 0.18s',
        top: lifted ? 8 : '50%', transform: lifted ? 'none' : 'translateY(-50%)',
        fontSize: lifted ? 10 : 14, fontWeight: lifted ? 700 : 400,
        color: error ? '#ef4444' : focused ? '#3b82f6' : '#475569',
        letterSpacing: lifted ? '0.06em' : 'normal',
        textTransform: lifted ? 'uppercase' : 'none',
        fontFamily: "'Outfit',sans-serif",
      }}>
        {label}
      </label>
      {/* Right slot */}
      {rightSlot && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          {rightSlot}
        </div>
      )}
      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: 11, color: '#f87171', marginTop: 4, paddingLeft: 4, fontFamily: "'Outfit',sans-serif" }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Background Orbs ────────────────────────────────────────────── */
function BgOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[
        { size: 480, color: '#3b82f611', top: '-120px', left: '-120px', delay: 0 },
        { size: 480, color: '#7c3aed11', bottom: '-120px', right: '-120px', delay: 1.2 },
        { size: 320, color: '#22c55e0a', top: '40%',  left: '50%', delay: 2.4 },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute', width: o.size, height: o.size, borderRadius: '50%',
          background: o.color, filter: 'blur(80px)',
          top: o.top, left: o.left, bottom: o.bottom, right: o.right,
          animation: `orbPulse 6s ease-in-out ${o.delay}s infinite`,
        }} />
      ))}
      {/* Grid overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.25 }} />
    </div>
  );
}

/* ─── Login Page ─────────────────────────────────────────────────── */
const Login = () => {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [rememberMe,    setRememberMe]    = useState(false);
  const [error,         setError]         = useState('');
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [loading,       setLoading]       = useState(false);
  const [success,       setSuccess]       = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const navigate  = useNavigate();
  const setAuth   = useAuthStore((state) => state.setAuth);
  const pwStrength = getPasswordStrength(password);

  /* ── Field Validation ── */
  const validate = () => {
    const errs = {};
    if (!email.trim())              errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email address';
    if (!password)                  errs.password = 'Password is required';
    else if (password.length < 6)   errs.password = 'Password must be at least 6 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const { data: tokenData } = await authAPI.login({ email, password });

      if (rememberMe) {
        localStorage.setItem('token', tokenData.access_token);
      } else {
        sessionStorage.setItem('token', tokenData.access_token);
      }

      const { data: userData } = await authAPI.getMe();
      setAuth(userData, tokenData.access_token);
      setSuccess(true);

      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      console.error('Login error:', err);
      setLoginAttempts(n => n + 1);
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@codereview.ai');
    setPassword('demo123');
    setFieldErrors({});
    setError('');
  };

  const EyeIcon = ({ open }) => open ? (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', position: 'relative', background: '#050810', fontFamily: "'Outfit',sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes orbPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes successPop { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        input[type="checkbox"] { accent-color: #3b82f6; width: 16px; height: 16px; cursor: pointer; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #080d18 inset !important; -webkit-text-fill-color: #e2e8f0 !important; }
      `}</style>

      <BgOrbs />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}
      >
        {/* ── Logo + Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', borderRadius: 18, marginBottom: 16, boxShadow: '0 8px 32px #3b82f640' }}
          >
            <svg width={32} height={32} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: 30, fontWeight: 800, margin: '0 0 6px', background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Welcome Back
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 14, color: '#475569', margin: 0 }}
          >
            Sign in to continue to <span style={{ color: '#60a5fa', fontWeight: 600 }}>CodeReview AI</span>
          </motion.p>
        </div>

        {/* ── Card ── */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          style={{ background: '#080d18', border: '1px solid #1e293b', borderRadius: 20, padding: '32px 28px', boxShadow: '0 24px 64px #00000055' }}
        >
          {/* Success state */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '24px 0' }}
              >
                <div style={{ fontSize: 52, marginBottom: 12, animation: 'successPop 0.5s ease' }}>✅</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>Signed in!</p>
                <p style={{ fontSize: 13, color: '#475569' }}>Redirecting to dashboard…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!success && (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Global error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -12, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ background: '#2d0a0a', border: '1px solid #991b1b', borderRadius: 11, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}
                  >
                    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, fontWeight: 600 }}>{error}</p>
                      {loginAttempts >= 2 && (
                        <p style={{ fontSize: 11, color: '#7f1d1d', margin: '4px 0 0' }}>
                          Forgot your password?{' '}
                          <Link to="/forgot-password" style={{ color: '#f87171', textDecoration: 'none', fontWeight: 700 }}>Reset it here</Link>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <FloatingInput
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: '' })); }}
                autoComplete="email"
                error={fieldErrors.email}
                icon={
                  <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />

              {/* Password */}
              <div>
                <FloatingInput
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: '' })); }}
                  autoComplete="current-password"
                  error={fieldErrors.password}
                  icon={
                    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  rightSlot={
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                      <EyeIcon open={showPassword} />
                    </button>
                  }
                />

                {/* Password strength bar */}
                <AnimatePresence>
                  {password.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: 8, paddingLeft: 4 }}>
                      <div style={{ height: 4, background: '#1e293b', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pwStrength.pct || 0}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 99, background: pwStrength.color, transition: 'background 0.3s' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: pwStrength.color, fontWeight: 700 }}>
                          {pwStrength.label}
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[
                            { check: password.length >= 6,        label: '6+ chars' },
                            { check: /[A-Z]/.test(password),      label: 'A-Z'      },
                            { check: /[0-9]/.test(password),      label: '0-9'      },
                            { check: /[^A-Za-z0-9]/.test(password), label: '#@!'    },
                          ].map(r => (
                            <span key={r.label} style={{ fontSize: 9, fontWeight: 700, color: r.check ? '#22c55e' : '#334155', transition: 'color 0.2s' }}>
                              {r.check ? '✓' : '·'} {r.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember me + Forgot password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span style={{ fontSize: 13, color: '#64748b', userSelect: 'none' }}>Remember me</span>
                </label>
                <Link to="/forgot-password" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 600, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                  onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}>
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%', padding: '14px', border: 'none', borderRadius: 13,
                  background: loading ? '#1e293b' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 20px #3b82f644', transition: 'all 0.2s',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? (
                  <>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="#334155" strokeWidth="4" fill="none" />
                      <path d="M4 12a8 8 0 018-8" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" fill="none" />
                    </svg>
                    <span style={{ color: '#60a5fa' }}>Signing in…</span>
                  </>
                ) : (
                  <>
                    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </>
                )}
              </motion.button>

              {/* Demo button */}
              <button
                type="button"
                onClick={fillDemo}
                style={{
                  width: '100%', padding: '11px', border: '1px dashed #1e293b', borderRadius: 11,
                  background: 'transparent', color: '#475569', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Outfit',sans-serif", display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = '#0d1830'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Fill Demo Credentials
              </button>
            </form>
          )}

          {/* Sign up link */}
          {!success && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #1e293b', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                  onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}>
                  Sign up for free →
                </Link>
              </p>
            </div>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 20 }}
        >
          {[
            { icon: '🔒', label: 'Secure' },
            { icon: '⚡', label: 'Fast' },
            { icon: '🎓', label: 'AI-Powered' },
          ].map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13 }}>{b.icon}</span>
              <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>{b.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          style={{ textAlign: 'center', fontSize: 11, color: '#1e293b', marginTop: 12 }}
        >
          By signing in, you agree to our{' '}
          <a href="#" style={{ color: '#334155', textDecoration: 'none' }}>Terms</a>
          {' & '}
          <a href="#" style={{ color: '#334155', textDecoration: 'none' }}>Privacy Policy</a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;