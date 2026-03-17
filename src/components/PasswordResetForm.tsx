import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  lang: 'es' | 'en';
}

const t = {
  es: {
    title: 'Recuperar Contrasena',
    subtitle: 'Te enviaremos un enlace para restablecer tu contrasena',
    email: 'CORREO ELECTRONICO',
    emailPlaceholder: 'tu@correo.com',
    sendButton: 'Enviar enlace de recuperacion',
    sending: 'Enviando...',
    successMessage: 'Revisa tu correo electronico. Te enviamos un enlace para restablecer tu contrasena.',
    errorGeneric: 'Ocurrio un error. Intenta de nuevo.',
    backToLogin: 'Volver a iniciar sesion',
    backToHome: 'Volver al inicio',
    trustSecure: 'Conexion segura',
    trustCloudflare: 'Proteccion Cloudflare',
    needHelp: 'Necesitas ayuda?',
    contactUs: 'Contactanos',
  },
  en: {
    title: 'Reset Password',
    subtitle: "We'll send you a link to reset your password",
    email: 'EMAIL ADDRESS',
    emailPlaceholder: 'you@email.com',
    sendButton: 'Send recovery link',
    sending: 'Sending...',
    successMessage: 'Check your email. We sent you a link to reset your password.',
    errorGeneric: 'An error occurred. Please try again.',
    backToLogin: 'Back to sign in',
    backToHome: 'Back to home',
    trustSecure: 'Secure connection',
    trustCloudflare: 'Cloudflare protection',
    needHelp: 'Need help?',
    contactUs: 'Contact us',
  },
};

export default function PasswordResetForm({ lang }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const strings = t[lang];

  const loginUrl = `/${lang}/login`;
  const updatePasswordUrl = lang === 'es'
    ? 'https://www.angaflow.com/es/actualizar-password'
    : 'https://www.angaflow.com/en/update-password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: updatePasswordUrl,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
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
                <linearGradient id="resetGrad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" fill="url(#resetGrad)" opacity="0.2" />
              <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" stroke="url(#resetGrad)" strokeWidth="1.5" fill="none" />
              <path d="M12 16l3 3 5-6" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
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
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }} />

          <div className="p-6 sm:p-8">

            {/* Lock icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white text-center">{strings.title}</h1>
            <p className="text-sm text-center mt-2 mb-6" style={{ color: '#94a3b8' }}>
              {strings.subtitle}
            </p>

            {success ? (
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
                <a
                  href={loginUrl}
                  className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#06b6d4' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  {strings.backToLogin}
                </a>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-2"
                    style={{ color: '#94a3b8', letterSpacing: '0.1em' }}
                  >
                    {strings.email}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-lg text-white text-sm focus:outline-none transition-all duration-200"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
                      onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.boxShadow = 'none'; }}
                      placeholder={strings.emailPlaceholder}
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
                      {strings.sendButton}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <a
                    href={loginUrl}
                    className="inline-flex items-center gap-2 text-sm transition-colors hover:underline"
                    style={{ color: '#06b6d4' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    {strings.backToLogin}
                  </a>
                </div>
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
