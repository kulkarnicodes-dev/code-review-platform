import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';

/* ─── Password Strength ──────────────────────────────────────────── */
function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '#1e293b', pct: 0 };
  let s = 0;
  if (pwd.length >= 8)              s++;
  if (pwd.length >= 12)             s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd))               s++;
  if (/[^a-zA-Z0-9]/.test(pwd))    s++;
  const map = [
    { label: '',           color: '#1e293b', pct: 0   },
    { label: 'Very Weak',  color: '#ef4444', pct: 20  },
    { label: 'Weak',       color: '#f97316', pct: 40  },
    { label: 'Fair',       color: '#f59e0b', pct: 60  },
    { label: 'Good',       color: '#3b82f6', pct: 80  },
    { label: 'Strong',     color: '#22c55e', pct: 100 },
  ];
  return { score: s, ...map[s] };
}

/* ─── Avatar generator from name ────────────────────────────────── */
function getAvatar(name) {
  if (!name?.trim()) return { initials: '?', hue: 220 };
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return { initials, hue };
}

/* ─── Floating Label Input ───────────────────────────────────────── */
function FloatingInput({ id, label, type = 'text', value, onChange, icon, rightSlot, error, autoComplete, hint }) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: error ? '#ef4444' : focused ? '#3b82f6' : '#475569', transition: 'color 0.2s', zIndex: 2, pointerEvents: 'none' }}>
          {icon}
        </div>
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
            fontFamily: "'Outfit',sans-serif", outline: 'none', transition: 'all 0.2s',
            boxShadow: focused ? `0 0 0 3px ${error ? '#ef444420' : '#3b82f620'}` : 'none',
          }}
        />
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
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: 11, color: '#f87171', marginTop: 5, paddingLeft: 4, fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width={11} height={11} fill="#f87171" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </motion.p>
        )}
        {!error && hint && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 11, color: '#22c55e', marginTop: 5, paddingLeft: 4, fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width={11} height={11} fill="#22c55e" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Eye Icon ───────────────────────────────────────────────────── */
function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" tabIndex={-1} onClick={onToggle}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', padding: 4 }}
      onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
      onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
      {show ? (
        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

/* ─── Step Indicator ─────────────────────────────────────────────── */
function StepIndicator({ step, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done    = i < step - 1;
        const current = i === step - 1;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: current ? 32 : 24, height: current ? 32 : 24,
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#22c55e' : current ? 'linear-gradient(135deg,#3b82f6,#7c3aed)' : '#1e293b',
              border: `2px solid ${done ? '#22c55e' : current ? '#3b82f6' : '#334155'}`,
              color: done || current ? '#fff' : '#475569',
              fontSize: current ? 13 : 11, fontWeight: 800,
              transition: 'all 0.3s', boxShadow: current ? '0 0 14px #3b82f640' : 'none',
              fontFamily: "'Outfit',sans-serif",
            }}>
              {done ? (
                <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            {i < total - 1 && (
              <div style={{ width: 36, height: 2, background: i < step - 1 ? '#22c55e' : '#1e293b', transition: 'background 0.4s', margin: '0 4px' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Perks List ─────────────────────────────────────────────────── */
const PERKS = [
  { icon: '🔍', text: 'AI-powered code analysis' },
  { icon: '🎓', text: 'Personalized AI mentor feedback' },
  { icon: '🏆', text: 'Gamified progress & badges' },
  { icon: '📈', text: 'Track improvement over time' },
];

/* ─── Background Orbs ────────────────────────────────────────────── */
function BgOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[
        { size: 480, color: '#22c55e0d', top: '-100px',  right: '-100px', delay: 0 },
        { size: 400, color: '#3b82f60d', bottom: '-100px',left: '-100px', delay: 1.5 },
        { size: 320, color: '#7c3aed0a', top: '40%',     left: '55%',    delay: 3   },
      ].map((o, i) => (
        <div key={i} style={{ position: 'absolute', width: o.size, height: o.size, borderRadius: '50%', background: o.color, filter: 'blur(80px)', top: o.top, left: o.left, bottom: o.bottom, right: o.right, animation: `orbPulse 7s ease-in-out ${o.delay}s infinite` }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.2 }} />
    </div>
  );
}

/* ─── Register Page ──────────────────────────────────────────────── */
const STEPS = ['Account Info', 'Set Password', 'Confirm'];

const Register = () => {
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [show, setShow]   = useState({ password: false, confirm: false });
  const [terms, setTerms] = useState(false);
  const [errs, setErrs]   = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate  = useNavigate();
  const strength  = useMemo(() => getStrength(form.password), [form.password]);
  const avatar    = useMemo(() => getAvatar(form.name), [form.name]);

  const reqs = useMemo(() => [
    { met: form.password.length >= 8,                                   text: 'At least 8 characters' },
    { met: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password), text: 'Upper & lowercase letters' },
    { met: /\d/.test(form.password),                                    text: 'Contains a number' },
    { met: /[^a-zA-Z0-9]/.test(form.password),                         text: 'Special character (!@#$)' },
  ], [form.password]);

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrs(f => ({ ...f, [field]: '' }));
    setError('');
  };

  /* ── Per-step validation ── */
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.name.trim())                               e.name  = 'Name is required';
      else if (form.name.trim().length < 2)               e.name  = 'At least 2 characters';
      if (!form.email.trim())                              e.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.email))          e.email = 'Enter a valid email';
    }
    if (s === 2) {
      if (!form.password)                                  e.password = 'Password is required';
      else if (form.password.length < 8)                   e.password = 'At least 8 characters';
    }
    if (s === 3) {
      if (!form.confirmPassword)                           e.confirmPassword = 'Please confirm your password';
      else if (form.password !== form.confirmPassword)     e.confirmPassword = 'Passwords do not match';
      if (!terms)                                          e.terms = 'Please accept the terms to continue';
    }
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => s + 1); };
  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setLoading(true);
    setError('');
    try {
      await authAPI.register({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { message: 'Account created! Please sign in.' } }), 2200);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', background: '#050810', fontFamily: "'Outfit',sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes orbPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes confettiPop { 0%{transform:scale(0) rotate(-10deg);opacity:0} 60%{transform:scale(1.15) rotate(3deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #080d18 inset !important; -webkit-text-fill-color: #e2e8f0 !important; }
        input[type="checkbox"] { accent-color: #3b82f6; width: 16px; height: 16px; cursor: pointer; }
      `}</style>

      <BgOrbs />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 10 }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* Animated avatar preview */}
          <motion.div
            key={avatar.initials}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 68, height: 68, borderRadius: 20, marginBottom: 14,
              background: form.name.trim()
                ? `linear-gradient(135deg, hsl(${avatar.hue},60%,35%), hsl(${(avatar.hue + 60) % 360},60%,30%))`
                : 'linear-gradient(135deg,#22c55e,#3b82f6)',
              boxShadow: `0 8px 32px hsl(${avatar.hue},60%,35%)44`,
              fontSize: form.name.trim() ? 26 : 28, fontWeight: 800, color: '#fff',
            }}
          >
            {form.name.trim() ? avatar.initials : (
              <svg width={32} height={32} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', background: 'linear-gradient(90deg,#4ade80,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {form.name.trim() ? `Hey, ${form.name.split(' ')[0]}! 👋` : 'Create Account'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            style={{ fontSize: 13, color: '#475569', margin: 0 }}
          >
            Join <span style={{ color: '#4ade80', fontWeight: 600 }}>CodeReview AI</span> and level up your coding
          </motion.p>
        </div>

        {/* ── Card ── */}
        <motion.div
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ background: '#080d18', border: '1px solid #1e293b', borderRadius: 22, padding: '28px 26px', boxShadow: '0 24px 64px #00000055' }}
        >
          {/* ── Success ── */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                style={{ textAlign: 'center', padding: '24px 0' }}
              >
                <div style={{ fontSize: 56, marginBottom: 14, animation: 'confettiPop 0.6s ease forwards' }}>🎉</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', margin: '0 0 6px' }}>Account Created!</h3>
                <p style={{ fontSize: 13, color: '#475569' }}>Redirecting you to sign in…</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                  {PERKS.map(p => (
                    <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 20 }}>
                      <span style={{ fontSize: 14 }}>{p.icon}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{p.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!success && (
            <>
              {/* Step indicator */}
              <StepIndicator step={step} total={STEPS.length} />

              {/* Step label */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Step {step} of {STEPS.length} — {STEPS[step - 1]}
                </span>
              </div>

              {/* Global error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, x: -10, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ background: '#2d0a0a', border: '1px solid #991b1b', borderRadius: 11, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2} style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} noValidate>
                <AnimatePresence mode="wait">

                  {/* ── Step 1: Account Info ── */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      <FloatingInput
                        id="name" label="Full Name" type="text" value={form.name}
                        onChange={set('name')} autoComplete="name" error={errs.name}
                        hint={form.name.trim().length >= 2 ? 'Looks good!' : ''}
                        icon={<svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                      />
                      <FloatingInput
                        id="email" label="Email Address" type="email" value={form.email}
                        onChange={set('email')} autoComplete="email" error={errs.email}
                        hint={/\S+@\S+\.\S+/.test(form.email) ? 'Valid email!' : ''}
                        icon={<svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>}
                      />

                      {/* Perks teaser */}
                      <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>What you'll get</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {PERKS.map(p => (
                            <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 14 }}>{p.icon}</span>
                              <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3 }}>{p.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button type="button" onClick={nextStep} style={{
                        width: '100%', padding: '14px', border: 'none', borderRadius: 13,
                        background: 'linear-gradient(135deg,#22c55e,#3b82f6)', color: '#fff',
                        fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 4px 20px #22c55e33', letterSpacing: '0.02em',
                      }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                        Continue
                        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </motion.div>
                  )}

                  {/* ── Step 2: Password ── */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      <FloatingInput
                        id="password" label="Password"
                        type={show.password ? 'text' : 'password'}
                        value={form.password} onChange={set('password')}
                        autoComplete="new-password" error={errs.password}
                        icon={<svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                        rightSlot={<EyeToggle show={show.password} onToggle={() => setShow(s => ({ ...s, password: !s.password }))} />}
                      />

                      {/* Strength bar */}
                      <AnimatePresence>
                        {form.password && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
                            {/* Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 99, overflow: 'hidden' }}>
                                <motion.div
                                  initial={{ width: 0 }} animate={{ width: `${strength.pct}%` }}
                                  transition={{ duration: 0.4 }}
                                  style={{ height: '100%', borderRadius: 99, background: strength.color, transition: 'background 0.3s' }}
                                />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: strength.color, minWidth: 64, textAlign: 'right' }}>{strength.label}</span>
                            </div>
                            {/* Requirements */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px' }}>
                              {reqs.map(r => (
                                <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.met ? '#052e16' : '#0a0f1a', border: `1.5px solid ${r.met ? '#22c55e' : '#1e293b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                    {r.met && <svg width={8} height={8} fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                  <span style={{ fontSize: 10, color: r.met ? '#86efac' : '#334155', fontWeight: r.met ? 600 : 400, transition: 'color 0.2s' }}>{r.text}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={prevStep} style={{
                          padding: '13px 18px', border: '1px solid #1e293b', borderRadius: 13,
                          background: 'transparent', color: '#64748b', fontSize: 14, fontWeight: 700,
                          cursor: 'pointer', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 6,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
                          <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                          Back
                        </button>
                        <button type="button" onClick={nextStep} style={{
                          flex: 1, padding: '13px', border: 'none', borderRadius: 13,
                          background: 'linear-gradient(135deg,#3b82f6,#7c3aed)', color: '#fff',
                          fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: '0 4px 20px #3b82f633',
                        }}
                          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                          onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                          Continue
                          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Step 3: Confirm ── */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Summary card */}
                      <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `linear-gradient(135deg, hsl(${avatar.hue},60%,35%), hsl(${(avatar.hue + 60) % 360},60%,30%))`,
                          fontSize: 16, fontWeight: 800, color: '#fff',
                        }}>{avatar.initials}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.name}</div>
                          <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.email}</div>
                        </div>
                        <button type="button" onClick={() => setStep(1)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#3b82f6', fontFamily: "'Outfit',sans-serif", fontWeight: 600, flexShrink: 0 }}>Edit</button>
                      </div>

                      <FloatingInput
                        id="confirmPassword" label="Confirm Password"
                        type={show.confirm ? 'text' : 'password'}
                        value={form.confirmPassword} onChange={set('confirmPassword')}
                        autoComplete="new-password" error={errs.confirmPassword}
                        hint={passwordsMatch ? 'Passwords match ✓' : ''}
                        icon={<svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        rightSlot={<EyeToggle show={show.confirm} onToggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))} />}
                      />

                      {/* Terms */}
                      <div style={{ background: errs.terms ? '#2d0a0a' : '#0a0f1a', border: `1px solid ${errs.terms ? '#991b1b' : '#1e293b'}`, borderRadius: 11, padding: '12px 14px', transition: 'all 0.2s' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                          <input type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); setErrs(f => ({ ...f, terms: '' })); }} style={{ marginTop: 1 }} />
                          <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, userSelect: 'none' }}>
                            I agree to the{' '}
                            <a href="#" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>Privacy Policy</a>
                          </span>
                        </label>
                        {errs.terms && (
                          <p style={{ fontSize: 11, color: '#f87171', marginTop: 6, marginBottom: 0, marginLeft: 26 }}>{errs.terms}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={prevStep} style={{
                          padding: '13px 18px', border: '1px solid #1e293b', borderRadius: 13,
                          background: 'transparent', color: '#64748b', fontSize: 14, fontWeight: 700,
                          cursor: 'pointer', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 6,
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}>
                          <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                          Back
                        </button>
                        <motion.button
                          type="submit"
                          disabled={loading}
                          whileHover={{ scale: loading ? 1 : 1.02 }}
                          whileTap={{ scale: loading ? 1 : 0.98 }}
                          style={{
                            flex: 1, padding: '13px', border: 'none', borderRadius: 13,
                            background: loading ? '#1e293b' : 'linear-gradient(135deg,#22c55e,#3b82f6,#7c3aed)',
                            color: '#fff', fontSize: 15, fontWeight: 800,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: loading ? 'none' : '0 4px 20px #22c55e33',
                          }}
                        >
                          {loading ? (
                            <>
                              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                                <circle cx="12" cy="12" r="10" stroke="#334155" strokeWidth="4" fill="none" />
                                <path d="M4 12a8 8 0 018-8" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" />
                              </svg>
                              <span style={{ color: '#4ade80' }}>Creating account…</span>
                            </>
                          ) : (
                            <>
                              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              Create Account
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Sign in link */}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #1e293b', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                    onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}>
                    Sign in →
                  </Link>
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* Trust row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20 }}>
          {[{ icon: '🔒', text: 'Secure' }, { icon: '⚡', text: 'Instant' }, { icon: '🎓', text: 'AI-Powered' }].map(b => (
            <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13 }}>{b.icon}</span>
              <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>{b.text}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;