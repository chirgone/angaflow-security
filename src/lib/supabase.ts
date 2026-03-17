import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Session timeout: 1 hour of inactivity
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const LAST_ACTIVITY_KEY = 'anga_last_activity';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Session Timeout Manager
 * Tracks user activity and signs out after 1 hour of inactivity.
 * Call initSessionTimeout() once when the app loads (e.g., in Dashboard).
 */
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

function updateLastActivity() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }
}

function getLastActivity(): number {
  if (typeof window === 'undefined') return Date.now();
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? parseInt(stored, 10) : Date.now();
}

async function checkInactivity() {
  const elapsed = Date.now() - getLastActivity();
  if (elapsed >= SESSION_TIMEOUT_MS) {
    // Session expired due to inactivity
    await supabase.auth.signOut();
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    // Redirect to login
    const lang = window.location.pathname.startsWith('/en') ? 'en' : 'es';
    window.location.href = `/${lang}/login?expired=1`;
  }
}

export function initSessionTimeout() {
  if (typeof window === 'undefined') return;

  // Set initial activity
  updateLastActivity();

  // Track user activity events
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  const throttledUpdate = throttle(updateLastActivity, 30000); // Update at most every 30s

  activityEvents.forEach((event) => {
    window.addEventListener(event, throttledUpdate, { passive: true });
  });

  // Check inactivity every 60 seconds
  if (timeoutTimer) clearInterval(timeoutTimer);
  timeoutTimer = setInterval(checkInactivity, 60000);

  // Also check immediately on visibility change (tab switch back)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkInactivity();
    }
  });
}

export function destroySessionTimeout() {
  if (timeoutTimer) {
    clearInterval(timeoutTimer);
    timeoutTimer = null;
  }
}

// Simple throttle utility
function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

/**
 * Get a valid session, refreshing the token if it's expired or about to expire.
 * Also checks inactivity timeout.
 */
export async function getSession() {
  // Check inactivity first
  if (typeof window !== 'undefined') {
    const elapsed = Date.now() - getLastActivity();
    if (elapsed >= SESSION_TIMEOUT_MS) {
      await supabase.auth.signOut();
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      return null;
    }
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) return null;

  // Decode JWT payload to check expiration
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresIn = (payload.exp || 0) - nowSec;

    // If token is expired or expires within 60 seconds, force refresh
    if (expiresIn < 60) {
      const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
      if (error || !refreshed) {
        await supabase.auth.signOut();
        return null;
      }
      return refreshed;
    }
  } catch {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    return refreshed ?? session;
  }

  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) updateLastActivity(); // Reset timer on login
  return { data, error };
}

export async function signOut() {
  destroySessionTimeout();
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  const { error } = await supabase.auth.signOut();
  return { error };
}
