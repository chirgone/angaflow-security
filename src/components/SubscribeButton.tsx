/**
 * Subscription Purchase Button
 * Client-side button for subscription checkout
 * - Checks if user is authenticated
 * - If not: redirects to registration
 * - If yes: creates MercadoPago checkout
 */

import { useState, useEffect } from 'react';
import { createCheckout } from '../lib/api';

interface Props {
  planId: 'watch' | 'guard' | 'shield';
  lang: 'es' | 'en';
  label: string;
  className?: string;
}

export default function SubscribeButton({ planId, lang, label, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication status on mount (dynamic import for client-side only)
    import('../lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsAuthenticated(!!session);
      });
    });
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);

    try {
      // Re-check auth status (in case it changed)
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in → redirect to registration
        window.location.href = `/${lang}/${lang === 'es' ? 'registro' : 'register'}`;
        return;
      }

      // Logged in → create MercadoPago checkout
      const result = await createCheckout('subscription', { plan_id: planId });
      window.location.href = result.checkout_url;
    } catch (err) {
      console.error('Subscription checkout error:', err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className={className}
    >
      {loading ? (lang === 'es' ? 'Procesando...' : 'Processing...') : label}
    </button>
  );
}
