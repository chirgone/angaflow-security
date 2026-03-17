import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createCheckout } from '../lib/api';

interface Props {
  plan: string;
  lang: 'es' | 'en';
}

const PLAN_INFO: Record<string, {
  name: { es: string; en: string };
  credits: number;
  price: number;
  promoPrice?: number;
}> = {
  starter: {
    name: { es: 'Starter', en: 'Starter' },
    credits: 1500,
    price: 1499,
    promoPrice: 749,
  },
  pro: {
    name: { es: 'Pro', en: 'Pro' },
    credits: 4500,
    price: 3299,
  },
  business: {
    name: { es: 'Business', en: 'Business' },
    credits: 9000,
    price: 5999,
  },
  enterprise: {
    name: { es: 'Enterprise', en: 'Enterprise' },
    credits: 16000,
    price: 9999,
  },
};

const t = {
  es: {
    title: 'Confirma tu compra',
    planLabel: 'Plan seleccionado',
    creditsLabel: 'Créditos incluidos',
    priceLabel: 'Precio',
    promoNote: 'Precio de lanzamiento (50% de descuento) - Solo primera compra',
    proceedButton: 'Proceder al Pago',
    loading: 'Procesando...',
    verifyingSession: 'Verificando sesión...',
    errorTitle: 'Error',
    errorSession: 'Debes iniciar sesión para continuar',
    errorGeneric: 'Ocurrió un error. Intenta de nuevo.',
    loginLink: 'Iniciar Sesión',
    backToDashboard: 'Volver al Dashboard',
    securePayment: 'Pago seguro con MercadoPago',
    instantCredits: 'Créditos acreditados al instante',
  },
  en: {
    title: 'Confirm your purchase',
    planLabel: 'Selected plan',
    creditsLabel: 'Credits included',
    priceLabel: 'Price',
    promoNote: 'Launch price (50% off) - First purchase only',
    proceedButton: 'Proceed to Payment',
    loading: 'Processing...',
    verifyingSession: 'Verifying session...',
    errorTitle: 'Error',
    errorSession: 'You must sign in to continue',
    errorGeneric: 'An error occurred. Please try again.',
    loginLink: 'Sign In',
    backToDashboard: 'Back to Dashboard',
    securePayment: 'Secure payment with MercadoPago',
    instantCredits: 'Credits added instantly',
  },
};

export default function CheckoutPage({ plan, lang }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstPurchase, setIsFirstPurchase] = useState(true);

  const strings = t[lang];
  const planInfo = PLAN_INFO[plan];

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        setCheckingAuth(false);
        return;
      }

      setIsAuthenticated(true);

      // Check if first purchase (for UI purposes - backend validates the real discount)
      try {
        const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://api.angaflow.com';
        const res = await fetch(`${apiUrl}/api/credits/balance`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          // If first_reload_bonus_available is true, user hasn't purchased yet
          setIsFirstPurchase(data.first_reload_bonus_available === true);
        }
      } catch (err) {
        // Default to showing promo price - backend will validate
        console.error('Error checking balance:', err);
      }

      setCheckingAuth(false);
    } catch (err) {
      console.error('Auth check error:', err);
      setCheckingAuth(false);
    }
  }

  async function handleProceed() {
    setLoading(true);
    setError('');

    try {
      const result = await createCheckout('credit_recharge', { package_id: plan });

      // GA4 event: begin_checkout
      if (typeof (window as any).gtag === 'function') {
        const price = plan === 'starter' && isFirstPurchase && planInfo.promoPrice
          ? planInfo.promoPrice 
          : planInfo.price;
        (window as any).gtag('event', 'begin_checkout', {
          currency: 'MXN',
          value: price,
          items: [{ 
            item_id: plan, 
            item_name: planInfo.name[lang], 
            price 
          }],
        });
      }

      // Redirect to MercadoPago
      window.location.href = result.checkout_url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || strings.errorGeneric);
      setLoading(false);
    }
  }

  // Loading state
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">{strings.verifyingSession}</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] px-4">
        <div className="max-w-md w-full bg-[#111827] border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{strings.errorTitle}</h2>
          <p className="text-slate-400 mb-6">{strings.errorSession}</p>
          <a
            href={`/${lang}/${lang === 'es' ? 'registro' : 'register'}?plan=${plan}`}
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all"
          >
            {strings.loginLink}
          </a>
        </div>
      </div>
    );
  }

  // Invalid plan
  if (!planInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] px-4">
        <div className="max-w-md w-full bg-[#111827] border border-slate-700 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{strings.errorTitle}</h2>
          <p className="text-slate-400 mb-6">Plan no válido: {plan}</p>
          <a
            href={`/${lang}/dashboard`}
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all"
          >
            {strings.backToDashboard}
          </a>
        </div>
      </div>
    );
  }

  const showPromoPrice = plan === 'starter' && isFirstPurchase && planInfo.promoPrice;
  const displayPrice = showPromoPrice ? planInfo.promoPrice! : planInfo.price;
  const savingsAmount = showPromoPrice ? planInfo.price - planInfo.promoPrice! : 0;

  return (
    <div className="min-h-screen bg-[#0a0f1a] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9nPjwvc3ZnPg==')] opacity-50"></div>
      
      <div className="relative flex items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-5xl w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 mb-6">
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <span className="text-xs font-medium text-cyan-400">{strings.securePayment}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">{strings.title}</h1>
            <p className="text-slate-400 text-lg">Anga Security</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 max-w-2xl mx-auto">
              {error}
            </div>
          )}

          {/* Main Content - Two Column Layout */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Column - Order Summary */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-slate-700/50 rounded-3xl p-8 lg:p-10 backdrop-blur-xl shadow-2xl shadow-black/20">
                {/* Plan Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{strings.planLabel}</p>
                    <h2 className="text-3xl font-bold text-white">{planInfo.name[lang]}</h2>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                </div>

                {/* Credits Display */}
                <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 6v12M6 12h12"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">{strings.creditsLabel}</p>
                        <p className="text-2xl font-bold font-mono bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                          {planInfo.credits.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Valor por crédito</p>
                      <p className="text-sm text-slate-400 font-mono">${(displayPrice / planInfo.credits).toFixed(2)} MXN</p>
                    </div>
                  </div>
                </div>

                {/* What's Included */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{lang === 'es' ? 'Incluido en tu compra' : 'Included in your purchase'}</h3>
                  <div className="grid gap-3">
                    {[
                      { icon: '🔍', text: lang === 'es' ? 'Auditorías de seguridad completas' : 'Complete security audits' },
                      { icon: '⚡', text: lang === 'es' ? 'Simulación de 75+ ataques' : '75+ attack simulations' },
                      { icon: '📊', text: lang === 'es' ? 'Reportes detallados PDF' : 'Detailed PDF reports' },
                      { icon: '🛡️', text: lang === 'es' ? 'Recomendaciones de seguridad' : 'Security recommendations' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm text-slate-300">{item.text}</span>
                        <svg className="w-4 h-4 text-green-400 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-700/50">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <p className="text-xs text-slate-400">{lang === 'es' ? 'Pago Seguro' : 'Secure Payment'}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <p className="text-xs text-slate-400">{strings.instantCredits}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                    </div>
                    <p className="text-xs text-slate-400">{lang === 'es' ? 'Sin Suscripción' : 'No Subscription'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Card */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="bg-gradient-to-b from-[#111827] to-[#0d1321] border border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-black/20 lg:sticky lg:top-8">
                {/* Price Display */}
                <div className="text-center mb-8">
                  <p className="text-sm text-slate-400 mb-2">{strings.priceLabel}</p>
                  {showPromoPrice && (
                    <div className="text-lg text-slate-500 line-through mb-1">
                      ${planInfo.price.toLocaleString()} MXN
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent font-mono">
                      ${displayPrice.toLocaleString()}
                    </span>
                    <span className="text-xl text-slate-400">MXN</span>
                  </div>
                  {showPromoPrice && (
                    <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                      <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <span className="text-sm font-semibold text-amber-400">
                        {lang === 'es' ? `Ahorras $${savingsAmount.toLocaleString()} MXN` : `You save $${savingsAmount.toLocaleString()} MXN`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Promo Note */}
                {showPromoPrice && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 8v4M12 16h.01"/>
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-400 mb-1">{lang === 'es' ? 'Oferta de Lanzamiento' : 'Launch Offer'}</p>
                        <p className="text-xs text-amber-400/80">{strings.promoNote}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proceed Button */}
                <button
                  onClick={handleProceed}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 bg-[length:200%_100%] animate-gradient text-white px-8 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  {loading ? (
                    <span className="flex items-center justify-center gap-3 relative">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {strings.loading}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3 relative">
                      {strings.proceedButton}
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  )}
                </button>

                {/* MercadoPago Badge */}
                <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <svg className="h-6" viewBox="0 0 120 30" fill="none">
                    <rect width="120" height="30" rx="4" fill="#00B1EA"/>
                    <text x="60" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">MercadoPago</text>
                  </svg>
                  <div className="h-4 w-px bg-slate-600"></div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <span className="text-xs text-slate-400">SSL 256-bit</span>
                  </div>
                </div>

                {/* Back link */}
                <div className="mt-6 text-center">
                  <a
                    href={`/${lang}/dashboard`}
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    {strings.backToDashboard}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
