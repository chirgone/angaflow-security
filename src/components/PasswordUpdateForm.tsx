import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  lang: 'es' | 'en';
}

const t = {
  es: {
    title: 'Actualizar Contrasena',
    subtitle: 'Ingresa tu nueva contrasena',
    newPassword: 'NUEVA CONTRASENA',
    confirmPassword: 'CONFIRMAR CONTRASENA',
    newPasswordPlaceholder: 'Minimo 6 caracteres',
    confirmPlaceholder: 'Repite tu nueva contrasena',
    updateButton: 'Actualizar contrasena',
    updating: 'Actualizando...',
    successMessage: 'Contrasena actualizada exitosamente. Redirigiendo...',
    passwordMismatch: 'Las contrasenas no coinciden',
    passwordMinLength: 'La contrasena debe tener al menos 6 caracteres',
    errorGeneric: 'Ocurrio un error. Intenta de nuevo.',
    errorNoSession: 'Sesion no valida. Solicita un nuevo enlace de recuperacion.',
    backToLogin: 'Volver a iniciar sesion',
    backToHome: 'Volver al inicio',
    loading: 'Verificando sesion...',
    trustSecure: 'Conexion segura',
    trustCloudflare: 'Proteccion Cloudflare',
    needHelp: 'Necesitas ayuda?',
    contactUs: 'Contactanos',
  },
  en: {
    title: 'Update Password',
    subtitle: 'Enter your new password',
    newPassword: 'NEW PASSWORD',
    confirmPassword: 'CONFIRM PASSWORD',
    newPasswordPlaceholder: 'Minimum 6 characters',
    confirmPlaceholder: 'Repeat your new password',
    updateButton: 'Update password',
    updating: 'Updating...',
    successMessage: 'Password updated successfully. Redirecting...',
    passwordMismatch: 'Passwords do not match',
    passwordMinLength: 'Password must be at least 6 characters',
    errorGeneric: 'An error occurred. Please try again.',
    errorNoSession: 'Invalid session. Please request a new recovery link.',
    backToLogin: 'Back to sign in',
    backToHome: 'Back to home',
    loading: 'Verifying session...',
    trustSecure: 'Secure connection',
    trustCloudflare: 'Cloudflare protection',
    needHelp: 'Need help?',
    contactUs: 'Contact us',
  },
};

export default function PasswordUpdateForm({ lang }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const strings = t[lang];

  const loginUrl = `/${lang}/login`;
  const resetUrl = `/${lang}/${lang === 'es' ? 'recuperar-password' : 'reset-password'}`;

  useEffect(() => {
    // Check if user has a valid session (arrived from recovery email)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    };

    // Listen for auth state changes (recovery link sets session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setHasSession(true);
        setChecking(false);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError(strings.passwordMinLength);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(strings.passwordMismatch);
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = `/${lang}/dashboard`;
        }, 2000);
      }
    } catch {
      setError(strings.errorGeneric);
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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="updateGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" fill="url(#updateGrad)" opacity="0.2" />
              <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" stroke="url(#updateGrad)" strokeWidth="1.5" fill="none" />
              <path d="M12 16l3 3 5-6" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-xl font-bold text-white">
              Anga <span style={{ color: '#06b6d4' }}>Security</span>
            </span>
          </a>
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
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }} />

          <div className="p-6 sm:p-8">

            {/* Key icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white text-center">{strings.title}</h1>
            <p className="text-sm text-center mt-2 mb-6" style={{ color: '#94a3b8' }}>
              {strings.subtitle}
            </p>

            {checking ? (
              /* Loading state */
              <div className="text-center py-8">
                <svg className="animate-spin mx-auto mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{strings.loading}</p>
              </div>
            ) : !hasSession ? (
              /* No session state */
              <div className="text-center space-y-5">
                <div
                  className="p-4 rounded-xl text-sm flex items-start gap-3"
                  style={{
                    background: 'rgba(251,191,36,0.08)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.15)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                  <span className="text-left">{strings.errorNoSession}</span>
                </div>
                <a
                  href={resetUrl}
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-lg font-semibold text-white text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                >
                  {lang === 'es' ? 'Solicitar nuevo enlace' : 'Request new link'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </a>
              </div>
            ) : success ? (
              /* Success state */
              <div className="text-center space-y-5">
                <div
                  className="p-4 rounded-xl text-sm flex items-start gap-3"
                  style={{
                    background: 'rgba(34,197,94,0.08)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="M22 4 12 14.01l-3-3" />
                  </svg>
                  <span className="text-left">{strings.successMessage}</span>
                </div>
                <svg className="animate-spin mx-auto" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* New password */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-2"
                    style={{ color: '#94a3b8', letterSpacing: '0.1em' }}
                  >
                    {strings.newPassword}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-11 pr-4 py-3 rounded-lg text-white text-sm focus:outline-none transition-all duration-200"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
                      onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.boxShadow = 'none'; }}
                      placeholder={strings.newPasswordPlaceholder}
                    />
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-2"
                    style={{ color: '#94a3b8', letterSpacing: '0.1em' }}
                  >
                    {strings.confirmPassword}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-11 pr-4 py-3 rounded-lg text-white text-sm focus:outline-none transition-all duration-200"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
                      onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.boxShadow = 'none'; }}
                      placeholder={strings.confirmPlaceholder}
                    />
                  </div>
                </div>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
                  }}
                >
                  {loading ? (
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <>
                      {strings.updateButton}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-6 mt-5 pt-5" style={{ borderTop: '1px solid #1e293b' }}>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                <span className="text-[11px]" style={{ color: '#64748b' }}>{strings.trustSecure}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                <span className="text-[11px]" style={{ color: '#64748b' }}>{strings.trustCloudflare}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs" style={{ color: '#475569' }}>
            {strings.needHelp}{' '}
            <a href="mailto:seguridad@angaflow.com" className="font-medium transition-colors hover:underline" style={{ color: '#94a3b8' }}>
              {strings.contactUs}
            </a>
          </p>
          <p className="text-[11px]" style={{ color: '#334155' }}>&copy; 2026 Anga Security</p>
        </div>

      </div>
    </div>
  );
}
