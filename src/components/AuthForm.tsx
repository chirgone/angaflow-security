import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  mode: 'login' | 'register';
  lang: 'es' | 'en';
}

// Translate Supabase auth errors to user-friendly messages
function translateAuthError(msg: string, lang: 'es' | 'en'): string {
  if (lang === 'en') return msg; // Supabase errors are already in English
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'Email not confirmed': 'Confirma tu correo antes de continuar',
    'User already registered': 'Este email ya tiene una cuenta',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Password should be at least 8 characters': 'La contraseña debe tener al menos 8 caracteres',
    'Too many requests': 'Demasiados intentos. Espera unos minutos.',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
    'Signup requires a valid password': 'La contraseña no es válida',
    'Unable to validate email address: invalid format': 'El formato del email no es válido',
  };
  return map[msg] ?? msg;
}

const t = {
  es: {
    loginTab: 'Iniciar Sesion',
    registerTab: 'Registrarse',
    loginSubtitle: 'Accede a tu plataforma de seguridad',
    registerSubtitle: 'Crea tu cuenta para proteger tu sitio',
    email: 'CORREO ELECTRONICO',
    password: 'CONTRASENA',
    confirmPassword: 'CONFIRMAR CONTRASENA',
    loginButton: 'Iniciar Sesion',
    registerButton: 'Crear Cuenta',
    forgotPassword: 'Olvidaste tu contrasena?',
    passwordMismatch: 'Las contrasenas no coinciden',
    checkEmail: 'Revisa tu correo electronico para confirmar tu cuenta',
    genericError: 'Ocurrio un error. Intenta de nuevo.',
    passwordMinLength: 'La contrasena debe tener al menos 8 caracteres',
    passwordTooWeak: 'Contrasena muy debil. Agrega mayusculas, numeros o simbolos.',
    emailPlaceholder: 'tu@correo.com',
    passwordPlaceholder: 'Tu contrasena (min. 8 caracteres)',
    confirmPlaceholder: 'Repite tu contrasena',
    trustSecure: 'Conexion segura',
    trustCloudflare: 'Proteccion Cloudflare',
    needHelp: 'Necesitas ayuda?',
    contactUs: 'Contactanos',
    backToHome: 'Volver al inicio',
    strengthWeak: 'Debil',
    strengthMedium: 'Media',
    strengthStrong: 'Fuerte',
    reqLength: '8+ caracteres',
    reqUpper: 'Mayusculas',
    reqNumber: 'Numeros',
    reqSymbol: 'Simbolos',
    passwordMatch: 'Las contrasenas coinciden',
    passwordNoMatch: 'Las contrasenas no coinciden',
  },
  en: {
    loginTab: 'Sign In',
    registerTab: 'Sign Up',
    loginSubtitle: 'Access your security platform',
    registerSubtitle: 'Create your account to protect your site',
    email: 'EMAIL ADDRESS',
    password: 'PASSWORD',
    confirmPassword: 'CONFIRM PASSWORD',
    loginButton: 'Sign In',
    registerButton: 'Create Account',
    forgotPassword: 'Forgot your password?',
    passwordMismatch: 'Passwords do not match',
    checkEmail: 'Check your email to confirm your account',
    genericError: 'An error occurred. Please try again.',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordTooWeak: 'Password too weak. Add uppercase letters, numbers or symbols.',
    emailPlaceholder: 'you@email.com',
    passwordPlaceholder: 'Your password (min. 8 characters)',
    confirmPlaceholder: 'Repeat your password',
    trustSecure: 'Secure connection',
    trustCloudflare: 'Cloudflare protection',
    needHelp: 'Need help?',
    contactUs: 'Contact us',
    backToHome: 'Back to home',
    strengthWeak: 'Weak',
    strengthMedium: 'Medium',
    strengthStrong: 'Strong',
    reqLength: '8+ characters',
    reqUpper: 'Uppercase',
    reqNumber: 'Numbers',
    reqSymbol: 'Symbols',
    passwordMatch: 'Passwords match',
    passwordNoMatch: 'Passwords do not match',
  },
};

// Shared SVG icons
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#22c55e' }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="authGrad" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" fill="url(#authGrad)" opacity="0.2" />
    <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" stroke="url(#authGrad)" strokeWidth="1.5" fill="none" />
    <path d="M12 16l3 3 5-6" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// ── Password strength scoring ────────────────────────────────
function getPasswordStrength(pw: string): {
  score: number; // 0-6
  level: 'weak' | 'medium' | 'strong';
  checks: { length: boolean; upper: boolean; lower: boolean; number: boolean; symbol: boolean };
} {
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    symbol:  /[^A-Za-z0-9]/.test(pw),
  };
  let score = 0;
  if (checks.length)                score += 1;
  if (pw.length >= 12)              score += 1;
  if (checks.upper)                 score += 1;
  if (checks.lower)                 score += 1;
  if (checks.number)                score += 1;
  if (checks.symbol)                score += 1;
  const level = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  return { score, level, checks };
}

export default function AuthForm({ mode: initialMode, lang }: Props) {
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const strings = t[lang];

  // Helper function to determine redirect URL after auth
  const getRedirectUrl = (userEmail: string): string => {
    // Check if user is admin
    const isAdmin = userEmail.toLowerCase() === 'jose301184@gmail.com';
    if (isAdmin) {
      return `/${lang}/admin`;
    }

    // Check if there's a plan query parameter (user came from pricing/hero)
    const urlParams = new URLSearchParams(window.location.search);
    const intendedPlan = urlParams.get('plan');
    
    if (intendedPlan && ['starter', 'pro', 'business', 'enterprise'].includes(intendedPlan)) {
      // Redirect to checkout page for the selected plan
      return `/${lang}/checkout/${intendedPlan}`;
    }

    // Default: go to dashboard
    return `/${lang}/dashboard`;
  };

  const pwStrength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthColor = pwStrength.level === 'weak' ? '#ef4444' : pwStrength.level === 'medium' ? '#eab308' : '#22c55e';
  const strengthLabel = pwStrength.level === 'weak' ? strings.strengthWeak : pwStrength.level === 'medium' ? strings.strengthMedium : strings.strengthStrong;
  const strengthWidth = `${Math.round((pwStrength.score / 6) * 100)}%`;

  const forgotPasswordUrl = `/${lang}/${lang === 'es' ? 'recuperar-password' : 'reset-password'}`;

  const handleTabChange = (newMode: 'login' | 'register') => {
    if (newMode === currentMode) return;
    setCurrentMode(newMode);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    // Update URL without reload
    const newUrl = newMode === 'login'
      ? `/${lang}/login`
      : `/${lang}/${lang === 'es' ? 'registro' : 'register'}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Safari/Apple password autofill may fill DOM inputs without triggering React onChange.
    // Read actual DOM values as fallback to ensure autofilled passwords are captured.
    const form = e.target as HTMLFormElement;
    const domEmail = (form.querySelector('input[name="email"]') as HTMLInputElement)?.value || email;
    const domPassword = (form.querySelector('input[name="password"]') as HTMLInputElement)?.value || password;
    const domConfirm = (form.querySelector('input[name="confirm-password"]') as HTMLInputElement)?.value || confirmPassword;
    const finalEmail = domEmail.toLowerCase().trim();
    const finalPassword = domPassword || password;
    const finalConfirm = domConfirm || confirmPassword;

    try {
      if (currentMode === 'register') {
        if (finalPassword.length < 8) {
          setError(strings.passwordMinLength);
          setLoading(false);
          return;
        }
        const strength = getPasswordStrength(finalPassword);
        if (strength.level === 'weak') {
          setError(strings.passwordTooWeak);
          setLoading(false);
          return;
        }
        if (finalPassword !== finalConfirm) {
          setError(strings.passwordMismatch);
          setLoading(false);
          return;
        }
        // Register via backend (Admin API - no emails sent, pre-confirmed)
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://api.angaflow.com';
        const registerRes = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: finalEmail, password: finalPassword }),
        });

        const registerData = await registerRes.json();

        if (!registerRes.ok || !registerData.success) {
          setError(translateAuthError(registerData.error || 'Registration failed', lang));
        } else if (registerData.session?.access_token) {
          // Set session in Supabase client for auto-login
          await supabase.auth.setSession({
            access_token: registerData.session.access_token,
            refresh_token: registerData.session.refresh_token,
          });
          // GA4 event: sign_up
          if (typeof (window as any).gtag === 'function') {
            (window as any).gtag('event', 'sign_up', { method: 'email' });
          }
          window.location.href = getRedirectUrl(finalEmail);
        } else {
          // Session not returned - sign in manually
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email: finalEmail, password: finalPassword });
          if (loginErr) {
            setError(translateAuthError(loginErr.message, lang));
          } else {
            // GA4 event: sign_up (via manual sign in after register)
            if (typeof (window as any).gtag === 'function') {
              (window as any).gtag('event', 'sign_up', { method: 'email' });
            }
            window.location.href = getRedirectUrl(finalEmail);
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password: finalPassword,
        });
        if (signInError) {
          setError(translateAuthError(signInError.message, lang));
        } else {
          window.location.href = getRedirectUrl(finalEmail);
        }
      }
    } catch {
      setError(strings.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-md">

        {/* Back link */}
        <div className="mb-6">
          <a
            href={`/${lang}/`}
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: '#64748b' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {strings.backToHome}
          </a>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <a href={`/${lang}/`} className="inline-flex flex-col items-center gap-3">
            <ShieldIcon />
            <span className="text-xl font-bold text-white">
              Anga <span style={{ color: '#06b6d4' }}>Security</span>
            </span>
          </a>
          <p className="mt-2 text-xs font-medium tracking-[0.2em] uppercase" style={{ color: '#64748b' }}>
            {lang === 'es' ? 'PLATAFORMA DE SEGURIDAD WEB' : 'WEB SECURITY PLATFORM'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#111827',
            border: '1px solid #1e293b',
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.03)',
          }}
        >
          {/* Top accent line */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }} />

          <div className="p-6 sm:p-8">

            {/* Title + Subtitle */}
            <h1 className="text-2xl font-bold text-white text-center">
              {currentMode === 'login' ? strings.loginTab : strings.registerTab}
            </h1>
            <p className="text-sm text-center mt-2 mb-6" style={{ color: '#94a3b8' }}>
              {currentMode === 'login' ? strings.loginSubtitle : strings.registerSubtitle}
            </p>

            {/* Tabs */}
            <div
              className="flex rounded-xl p-1 mb-6"
              style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
            >
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={
                  currentMode === 'login'
                    ? { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff' }
                    : { background: 'transparent', color: '#64748b' }
                }
              >
                {strings.loginTab}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={
                  currentMode === 'register'
                    ? { background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff' }
                    : { background: 'transparent', color: '#64748b' }
                }
              >
                {strings.registerTab}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label
                  className="block text-[11px] font-semibold mb-2"
                  style={{ color: '#94a3b8', letterSpacing: '0.1em' }}
                >
                  {strings.email}
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MailIcon />
                  </div>
                  <input
                    type="email"
                    name="email"
                    autoComplete={currentMode === 'register' ? 'email' : 'username'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-lg text-white text-sm focus:outline-none transition-all duration-200"
                    style={{
                      background: '#0a0a0f',
                      border: '1px solid #1e293b',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.boxShadow = 'none'; }}
                    placeholder={strings.emailPlaceholder}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-[11px] font-semibold mb-2"
                  style={{ color: '#94a3b8', letterSpacing: '0.1em' }}
                >
                  {strings.password}
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <LockIcon />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={currentMode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-11 pr-10 py-3 rounded-lg text-white text-sm focus:outline-none transition-all duration-200"
                    style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
                    onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.boxShadow = 'none'; }}
                    placeholder={strings.passwordPlaceholder}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                    style={{ color: '#64748b' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {/* Password strength meter — register only */}
                {currentMode === 'register' && password.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {/* Strength bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: strengthWidth, background: strengthColor }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold w-12 text-right" style={{ color: strengthColor }}>
                        {strengthLabel}
                      </span>
                    </div>
                    {/* Criteria checklist */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {[
                        { ok: pwStrength.checks.length, label: strings.reqLength },
                        { ok: pwStrength.checks.upper,  label: strings.reqUpper },
                        { ok: pwStrength.checks.number, label: strings.reqNumber },
                        { ok: pwStrength.checks.symbol, label: strings.reqSymbol },
                      ].map(({ ok, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span style={{ color: ok ? '#22c55e' : '#475569', fontSize: 10 }}>
                            {ok ? '✓' : '✗'}
                          </span>
                          <span className="text-[11px]" style={{ color: ok ? '#94a3b8' : '#475569' }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forgot password link — login only */}
                {currentMode === 'login' && (
                  <div className="text-right mt-2">
                    <a
                      href={forgotPasswordUrl}
                      className="text-xs transition-colors hover:underline"
                      style={{ color: '#06b6d4' }}
                    >
                      {strings.forgotPassword}
                    </a>
                  </div>
                )}
              </div>

              {/* Confirm Password — register only */}
              {currentMode === 'register' && (
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-2"
                    style={{ color: '#94a3b8', letterSpacing: '0.1em' }}
                  >
                    {strings.confirmPassword}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <LockIcon />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      name="confirm-password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-11 pr-10 py-3 rounded-lg text-white text-sm focus:outline-none transition-all duration-200"
                      style={{
                        background: '#0a0a0f',
                        border: confirmPassword.length > 0
                          ? confirmPassword === password ? '1px solid #22c55e' : '1px solid #ef4444'
                          : '1px solid #1e293b',
                      }}
                      onFocus={(e) => { if (!confirmPassword) { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; } }}
                      onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                      placeholder={strings.confirmPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                      style={{ color: '#64748b' }}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <p className="text-[11px] mt-1.5" style={{ color: confirmPassword === password ? '#22c55e' : '#ef4444' }}>
                      {confirmPassword === password ? `✓ ${strings.passwordMatch}` : `✗ ${strings.passwordNoMatch}`}
                    </p>
                  )}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.15)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Success message */}
              {success && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {success}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
                }}
                onMouseOver={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.35)'; }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 4px 15px rgba(6, 182, 212, 0.2)'; }}
              >
                {loading ? (
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <>
                    {currentMode === 'login' ? strings.loginButton : strings.registerButton}
                    <ArrowIcon />
                  </>
                )}
              </button>
            </form>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 mt-5">
              <div className="flex items-center gap-1.5">
                <CheckIcon />
                <span className="text-[11px]" style={{ color: '#64748b' }}>{strings.trustSecure}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckIcon />
                <span className="text-[11px]" style={{ color: '#64748b' }}>{strings.trustCloudflare}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs" style={{ color: '#475569' }}>
            {strings.needHelp}{' '}
            <a
              href="mailto:seguridad@angaflow.com"
              className="font-medium transition-colors hover:underline"
              style={{ color: '#94a3b8' }}
            >
              {strings.contactUs}
            </a>
          </p>
          <p className="text-[11px]" style={{ color: '#334155' }}>
            &copy; 2026 Anga Security
          </p>
        </div>

      </div>
    </div>
  );
}
