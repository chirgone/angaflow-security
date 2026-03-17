import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  getAdminStats,
  getAdminUsers,
  getAdminPayments,
  getAdminCredits,
  getAdminSubscriptions,
  getAdminReports,
  getAdminActivity,
  getAdminLeads,
  updateLead,
  getAdminUserAudit,
} from '../lib/api';
import {
  DonutChart,
  HorizontalBarChart,
  MetricCard,
  SectionHeader,
  COLORS,
  CHART_PALETTE,
  formatNumber,
} from './AuditCharts';

interface Props {
  lang: 'es' | 'en';
}

const ADMIN_EMAIL = 'jose301184@gmail.com';

const tabs = [
  { id: 'overview', es: 'Resumen', en: 'Overview', icon: '\u2302' },
  { id: 'users', es: 'Usuarios', en: 'Users', icon: '\u263A' },
  { id: 'payments', es: 'Pagos', en: 'Payments', icon: '\u2B24' },
  { id: 'credits', es: 'Cr\u00E9ditos', en: 'Credits', icon: '\u2726' },
  { id: 'subscriptions', es: 'Suscripciones', en: 'Subscriptions', icon: '\u272A' },
  { id: 'reports', es: 'Reportes', en: 'Reports', icon: '\u2630' },
  { id: 'leads', es: 'Leads', en: 'Leads', icon: '\u260E' },
  { id: 'activity', es: 'Actividad', en: 'Activity', icon: '\u26A1' },
] as const;

type TabId = (typeof tabs)[number]['id'];

// ---- Inline SVG mini-icons for KPI cards ----
function IconUsers({ color = '#06b6d4' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconRevenue({ color = '#22c55e' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconCredits({ color = '#3b82f6' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
function IconSubs({ color = '#f59e0b' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconReports({ color = '#a855f7' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ---- Mini gauge for credit utilization ----
function MiniGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="system-ui">
          {pct.toFixed(0)}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="system-ui">
          {label}
        </text>
      </svg>
    </div>
  );
}

export default function AdminDashboard({ lang }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [recentCredits, setRecentCredits] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subsByPlan, setSubsByPlan] = useState<Record<string, number>>({});
  const [reports, setReports] = useState<any[]>([]);
  const [reportsByType, setReportsByType] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsStats, setLeadsStats] = useState<any>(null);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  // Reports filter state
  const [reportSearch, setReportSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  function applyReportFilters(list: any[]) {
    const q = reportSearch.toLowerCase();
    return list.filter((r) => {
      const email: string = (r as any).security_accounts?.email || '';
      const domain: string = r.domain || '';
      const matchSearch = !q || domain.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      const matchType = reportTypeFilter === 'all' || r.report_type === reportTypeFilter;
      const matchStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }

  // Audit modal state
  const [auditUser, setAuditUser] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Lead detail modal state
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadNotes, setLeadNotes] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  // New leads count for badge (loaded globally)
  const [newLeadsCount, setNewLeadsCount] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) loadTab(activeTab);
  }, [activeTab, user]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    if (session.user.email !== ADMIN_EMAIL) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    setUser(session.user);
    setLoading(false);
  }

  async function loadTab(tab: TabId) {
    setTabLoading(true);
    setTabError(null);
    try {
      switch (tab) {
        case 'overview': {
          const [s, cr, sub, r, act, l] = await Promise.all([
            getAdminStats(),
            getAdminCredits(),
            getAdminSubscriptions(),
            getAdminReports(),
            getAdminActivity(),
            getAdminLeads(),
          ]);
          setStats(s);
          setCreditSummary(cr.summary);
          setSubsByPlan(sub.by_plan);
          setReportsByType(r.by_type);
          setActivity(act.activity.slice(0, 10));
          // Set new leads count for badge
          setNewLeadsCount(l.stats?.by_status?.new || 0);
          break;
        }
        case 'users': {
          const u = await getAdminUsers();
          setUsers(u.users);
          setUsersTotal(u.total);
          break;
        }
        case 'payments': {
          const p = await getAdminPayments();
          setPayments(p.payments);
          setPaymentsTotal(p.total);
          break;
        }
        case 'credits': {
          const cr = await getAdminCredits();
          setCreditSummary(cr.summary);
          setRecentCredits(cr.recent_transactions);
          break;
        }
        case 'subscriptions': {
          const sub = await getAdminSubscriptions();
          setSubscriptions(sub.subscriptions);
          setSubsByPlan(sub.by_plan);
          break;
        }
        case 'reports': {
          const r = await getAdminReports();
          setReports(r.reports);
          setReportsByType(r.by_type);
          break;
        }
        case 'leads': {
          const l = await getAdminLeads();
          setLeads(l.leads);
          setLeadsStats(l.stats);
          setLeadsTotal(l.total);
          // Update new leads count for badge
          setNewLeadsCount(l.stats?.by_status?.new || 0);
          break;
        }
        case 'activity': {
          const act = await getAdminActivity();
          setActivity(act.activity);
          break;
        }
      }
    } catch (err: any) {
      console.error('Failed to load tab:', err);
      setTabError(err?.message || 'Error loading data');
    }
    setTabLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = `/${lang}/`;
  }

  async function openAudit(u: any) {
    setAuditUser(u);
    setAuditData(null);
    setAuditLoading(true);
    try {
      const data = await getAdminUserAudit(u.id);
      setAuditData(data);
    } catch (err) {
      console.error('Failed to load audit:', err);
    }
    setAuditLoading(false);
  }

  function closeAudit() {
    setAuditUser(null);
    setAuditData(null);
  }

  function exportAuditPDF() {
    if (!auditUser || !auditData) return;

    const d = auditData;
    const typeLabels: Record<string, string> = { recharge: 'Recarga', bonus: 'Bonus', deduction: 'Deduccion', refund: 'Reembolso' };
    const typeColors: Record<string, string> = { recharge: '#16a34a', bonus: '#ca8a04', deduction: '#dc2626', refund: '#2563eb' };
    const fmtDate = (s: string) => new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
    const fmtTime = (s: string) => new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let txRows = '';
    for (const tx of d.transactions) {
      const sign = tx.type === 'deduction' ? '-' : '+';
      const c = typeColors[tx.type] || '#555';
      txRows += '<tr>'
        + '<td>' + fmtDate(tx.created_at) + ' ' + fmtTime(tx.created_at) + '</td>'
        + '<td><span style="color:' + c + ';font-weight:700">' + (typeLabels[tx.type] || tx.type) + '</span></td>'
        + '<td style="text-align:right;color:' + c + ';font-weight:700">' + sign + Number(tx.total_credits).toLocaleString() + '</td>'
        + '<td>' + (tx.description || '—') + '</td>'
        + '</tr>';
    }

    let payRows = '';
    for (const p of d.payments) {
      const sc = p.status === 'approved' ? '#16a34a' : '#ca8a04';
      const pkg = (p.metadata?.package_id || '—') + (p.metadata?.credits ? ' (' + parseInt(p.metadata.credits).toLocaleString() + ' cr)' : '');
      payRows += '<tr>'
        + '<td style="font-family:monospace;font-size:11px">' + p.payment_id + '</td>'
        + '<td style="color:' + sc + ';font-weight:700">' + p.status + '</td>'
        + '<td style="text-align:right;font-weight:700">$' + parseFloat(p.amount).toLocaleString() + ' ' + p.currency + '</td>'
        + '<td>' + pkg + '</td>'
        + '<td style="text-align:right">' + fmtDate(p.created_at) + '</td>'
        + '</tr>';
    }

    let repRows = '';
    for (const r of d.reports) {
      const cc = r.credits_charged > 0 ? '#dc2626' : '#555';
      const cv = r.credits_charged > 0 ? ('-' + r.credits_charged.toLocaleString()) : '0';
      repRows += '<tr>'
        + '<td style="font-weight:700">' + r.type + '</td>'
        + '<td style="font-family:monospace;font-size:11px">' + (r.domain || '—') + '</td>'
        + '<td style="text-align:right;color:' + cc + '">' + cv + '</td>'
        + '<td style="text-align:right">' + fmtDate(r.created_at) + '</td>'
        + '</tr>';
    }

    const txSection = txRows
      ? '<h2>Historial de Transacciones (' + d.transactions.length + ')</h2>'
        + '<table><thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right">Creditos</th><th>Descripcion</th></tr></thead>'
        + '<tbody>' + txRows + '</tbody></table>'
      : '';
    const paySection = payRows
      ? '<h2>Pagos MercadoPago (' + d.payments.length + ')</h2>'
        + '<table><thead><tr><th>Payment ID</th><th>Status</th><th style="text-align:right">Monto</th><th>Paquete</th><th style="text-align:right">Fecha</th></tr></thead>'
        + '<tbody>' + payRows + '</tbody></table>'
      : '';
    const repSection = repRows
      ? '<h2>Reportes Generados (' + d.reports.length + ')</h2>'
        + '<table><thead><tr><th>Tipo</th><th>Dominio</th><th style="text-align:right">Creditos</th><th style="text-align:right">Fecha</th></tr></thead>'
        + '<tbody>' + repRows + '</tbody></table>'
      : '';

    const statusColor = auditUser.status === 'active' ? '#16a34a' : '#dc2626';
    const regDate = new Date(auditUser.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const genDate = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    const css = [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }',
      'h1 { font-size: 20px; margin-bottom: 4px; }',
      '.meta { font-size: 11px; color: #555; margin-bottom: 20px; }',
      '.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: #e5e7eb; color: #374151; margin-right: 6px; }',
      'h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }',
      '.grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 4px; }',
      '.kpi { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }',
      '.kl { font-size: 10px; color: #6b7280; margin-bottom: 3px; }',
      '.kv { font-size: 16px; font-weight: 800; }',
      'table { width: 100%; border-collapse: collapse; font-size: 11px; }',
      'th { text-align: left; padding: 6px 8px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; }',
      'td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }',
      'tr:last-child td { border-bottom: none; }',
      '.footer { margin-top: 28px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }',
      '@media print { body { padding: 16px; } }',
    ].join(' ');

    const html = '<!DOCTYPE html><html lang="es"><head>'
      + '<meta charset="UTF-8">'
      + '<title>Auditoria - ' + auditUser.email + '</title>'
      + '<style>' + css + '</style>'
      + '</head><body>'
      + '<h1>Auditoria de Creditos</h1>'
      + '<div class="meta">'
      + '<span style="color:#0891b2;font-weight:700">' + auditUser.email + '</span>&nbsp;&nbsp;'
      + '<span class="badge">' + auditUser.plan_type + '</span>'
      + '<span class="badge" style="color:' + statusColor + '">' + auditUser.status + '</span>'
      + '&nbsp;Registro: ' + regDate
      + '</div>'
      + '<h2>Resumen</h2>'
      + '<div class="grid">'
      + '<div class="kpi"><div class="kl">Saldo Actual</div><div class="kv" style="color:#0891b2">' + Number(d.account.credit_balance).toLocaleString() + ' cr</div></div>'
      + '<div class="kpi"><div class="kl">Total Recargado</div><div class="kv" style="color:#16a34a">' + Number(d.summary.total_recharged).toLocaleString() + ' cr</div></div>'
      + '<div class="kpi"><div class="kl">Bonos</div><div class="kv" style="color:#ca8a04">' + Number(d.summary.total_bonuses).toLocaleString() + ' cr</div></div>'
      + '<div class="kpi"><div class="kl">Total Gastado</div><div class="kv" style="color:#dc2626">' + Number(d.summary.total_spent).toLocaleString() + ' cr</div></div>'
      + '<div class="kpi"><div class="kl">Reembolsado</div><div class="kv" style="color:#2563eb">' + Number(d.summary.total_refunded).toLocaleString() + ' cr</div></div>'
      + '<div class="kpi"><div class="kl">Pagado MXN</div><div class="kv" style="color:#7c3aed">$' + Number(d.summary.total_paid_mxn).toLocaleString() + ' MXN</div></div>'
      + '</div>'
      + txSection + paySection + repSection
      + '<div class="footer">Anga Security — Generado el ' + genDate + '</div>'
      + '</body></html>';

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => win.print();
    }
  }

  // ---- Render helpers ----

  function formatMXN(amount: number) {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return lang === 'es' ? 'ahora' : 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  // ---- Pre-computed chart data (avoids IIFEs inside JSX which break esbuild) ----
  function planSlices() {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.plan_type] = (counts[u.plan_type] || 0) + 1; });
    return Object.entries(counts).map(([plan, count]) => ({
      label: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: count,
      color: planColors[plan] || '#64748b',
    }));
  }
  function userStatusSlices() {
    const counts: Record<string, number> = {};
    users.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'active' ? '#22c55e' : status === 'suspended' ? '#ef4444' : '#64748b',
    }));
  }
  function paymentStatusSlices() {
    const counts: Record<string, number> = {};
    payments.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'approved' ? '#22c55e' : status === 'pending' ? '#f59e0b' : '#ef4444',
    }));
  }
  function paymentKPIs() {
    const approved = payments.filter(p => p.status === 'approved');
    const totalRevenue = approved.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const avgPayment = approved.length > 0 ? totalRevenue / approved.length : 0;
    const uniquePayers = new Set(approved.map(p => p.payer_email).filter(Boolean)).size;
    return [
      { label: lang === 'es' ? 'Ingresos Totales' : 'Total Revenue', value: formatMXN(totalRevenue), color: '#22c55e' },
      { label: lang === 'es' ? 'Pagos Aprobados' : 'Approved Payments', value: String(approved.length), color: '#06b6d4' },
      { label: lang === 'es' ? 'Pago Promedio' : 'Avg Payment', value: formatMXN(avgPayment), color: '#3b82f6' },
      { label: lang === 'es' ? 'Pagadores \u00DAnicos' : 'Unique Payers', value: String(uniquePayers), color: '#f59e0b' },
    ];
  }
  function reportStatusSlices() {
    const counts: Record<string, number> = {};
    reports.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'completed' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#f59e0b',
    }));
  }
  function domainItems() {
    const counts: Record<string, number> = {};
    reports.forEach(r => { if (r.domain) counts[r.domain] = (counts[r.domain] || 0) + 1; });
    return Object.entries(counts).map(([domain, count]) => ({ label: domain, value: count }));
  }
  function activitySlices() {
    const counts: Record<string, number> = {};
    activity.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      label: activityTypeLabel(type),
      value: count,
      color: activityTypeColor(type),
    }));
  }
  function fmtReportes(v: number) { return v + ' ' + (lang === 'es' ? 'reportes' : 'reports'); }

  const activityTypeColor = (type: string) => {
    if (type === 'user_registered') return '#06b6d4';
    if (type === 'payment') return '#22c55e';
    if (type === 'report') return '#a855f7';
    if (type.startsWith('credit_')) return '#3b82f6';
    return '#64748b';
  };

  const activityTypeLabel = (type: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      user_registered: { es: 'Registro', en: 'Signup' },
      payment: { es: 'Pago', en: 'Payment' },
      report: { es: 'Reporte', en: 'Report' },
      credit_recharge: { es: 'Recarga', en: 'Recharge' },
      credit_bonus: { es: 'Bono', en: 'Bonus' },
      credit_deduction: { es: 'Deducci\u00F3n', en: 'Deduction' },
      credit_refund: { es: 'Reembolso', en: 'Refund' },
    };
    return labels[type]?.[lang] || type;
  };

  const reportTypeColor: Record<string, string> = {
    quick_scan: '#94a3b8',
    audit: '#3b82f6',
    compliance: '#8b5cf6',
    simulation: '#f59e0b',
    assessment: '#06b6d4',
  };

  const reportTypeLabel = (type: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      quick_scan: { es: 'Escaneo R\u00E1pido', en: 'Quick Scan' },
      audit: { es: 'Auditor\u00EDa', en: 'Audit' },
      compliance: { es: 'Cumplimiento', en: 'Compliance' },
      simulation: { es: 'Simulaci\u00F3n', en: 'Simulation' },
      assessment: { es: 'Evaluaci\u00F3n', en: 'Assessment' },
    };
    return labels[type]?.[lang] || type.replace('_', ' ');
  };

  const planColors: Record<string, string> = {
    watch: '#94a3b8',
    guard: '#06b6d4',
    shield: '#f59e0b',
    free: '#64748b',
  };

  // ---- Loading / Auth states ----

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span style={{ color: '#94a3b8' }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-lg mb-4" style={{ color: '#94a3b8' }}>
            {lang === 'es' ? 'Inicia sesi\u00F3n como administrador' : 'Sign in as admin'}
          </p>
          <a href={`/${lang}/login`} className="px-6 py-3 rounded-lg font-semibold text-white inline-block"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
            {lang === 'es' ? 'Iniciar Sesi\u00F3n' : 'Sign In'}
          </a>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="mx-auto mb-4">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <p className="text-lg" style={{ color: '#ef4444' }}>
            {lang === 'es' ? 'Acceso denegado' : 'Access denied'}
          </p>
        </div>
      </div>
    );
  }

  // ---- Main Admin Dashboard ----

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2" style={{ borderColor: '#1e293b' }}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <a href={`/${lang}/`} className="flex items-center gap-2 flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="sm:w-7 sm:h-7">
              <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
              <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" stroke="url(#g)" strokeWidth="1.5" fill="none" />
              <path d="M12 16l3 3 5-6" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="font-bold text-white hidden sm:inline">Anga <span style={{ color: '#06b6d4' }}>Security</span></span>
          </a>
          <span className="text-xs sm:text-sm font-medium px-2 py-0.5 rounded" style={{ color: '#f59e0b', background: '#f59e0b10', border: '1px solid #f59e0b30' }}>Admin</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <a href={`/${lang}/dashboard`} className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg transition-colors hover:text-white" style={{ color: '#94a3b8', border: '1px solid #1e293b' }}>
            Dashboard
          </a>
          <button onClick={handleLogout} className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg transition-colors hover:text-white" style={{ color: '#94a3b8', border: '1px solid #1e293b' }}>
            {lang === 'es' ? 'Salir' : 'Logout'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id ? 'text-white shadow-lg' : 'hover:text-white'
              }`}
              style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
              }}
            >
              {tab[lang]}
              {tab.id === 'leads' && newLeadsCount > 0 && (
                <span
                  className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full"
                  style={{ background: '#22c55e', color: '#fff', minWidth: '18px', textAlign: 'center' }}
                >
                  {newLeadsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tabLoading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Cargando...' : 'Loading...'}</span>
          </div>
        )}

        {!tabLoading && tabError && (
          <div className="rounded-xl p-5 flex items-start gap-3 mb-6" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                {lang === 'es' ? 'Error al cargar datos' : 'Error loading data'}
              </p>
              <p className="text-xs mt-1" style={{ color: '#fca5a5' }}>{tabError}</p>
              <button
                onClick={() => loadTab(activeTab)}
                className="mt-2 text-xs font-medium underline"
                style={{ color: '#ef4444' }}
              >
                {lang === 'es' ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================
            OVERVIEW TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* KPI Cards - Clickable */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { label: lang === 'es' ? 'Usuarios' : 'Users', value: stats.total_users, color: '#06b6d4', tab: 'users' as TabId, Icon: IconUsers },
                { label: lang === 'es' ? 'Ingresos' : 'Revenue', value: formatMXN(stats.total_revenue_mxn), color: '#22c55e', tab: 'payments' as TabId, Icon: IconRevenue },
                { label: lang === 'es' ? 'Cr\u00E9ditos Vendidos' : 'Credits Sold', value: formatNumber(stats.total_credits_sold), color: '#3b82f6', tab: 'credits' as TabId, Icon: IconCredits },
                { label: lang === 'es' ? 'Suscripciones' : 'Subscriptions', value: stats.active_subscriptions, color: '#f59e0b', tab: 'subscriptions' as TabId, Icon: IconSubs },
                { label: lang === 'es' ? 'Reportes' : 'Reports', value: stats.total_reports, color: '#a855f7', tab: 'reports' as TabId, Icon: IconReports },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group"
                  style={{ background: '#111827', border: '1px solid #1e293b' }}
                  onClick={() => setActiveTab(kpi.tab)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <kpi.Icon color={kpi.color} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>{kpi.label}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: kpi.color }}>
                    {lang === 'es' ? 'Ver detalle' : 'View details'} {'\u2192'}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Reports by Type - DonutChart */}
              <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <SectionHeader
                  title={lang === 'es' ? 'Reportes por Tipo' : 'Reports by Type'}
                  subtitle={lang === 'es' ? 'Distribuci\u00F3n total' : 'Total distribution'}
                />
                {Object.keys(reportsByType).length > 0 ? (
                  <div className="flex justify-center">
                    <DonutChart
                      size={170}
                      centerValue={String(Object.values(reportsByType).reduce((a, b) => a + b, 0))}
                      centerLabel={lang === 'es' ? 'total' : 'total'}
                      slices={Object.entries(reportsByType).map(([type, count]) => ({
                        label: reportTypeLabel(type),
                        value: count,
                        color: reportTypeColor[type] || '#64748b',
                      }))}
                      onSliceClick={() => setActiveTab('reports')}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: '#64748b' }}>{lang === 'es' ? 'Sin datos' : 'No data'}</div>
                )}
              </div>

              {/* Subscriptions by Plan - DonutChart */}
              <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <SectionHeader
                  title={lang === 'es' ? 'Suscripciones por Plan' : 'Subscriptions by Plan'}
                  subtitle={lang === 'es' ? 'Planes activos' : 'Active plans'}
                />
                {Object.values(subsByPlan).some(v => v > 0) ? (
                  <div className="flex justify-center">
                    <DonutChart
                      size={170}
                      centerValue={String(Object.values(subsByPlan).reduce((a, b) => a + b, 0))}
                      centerLabel={lang === 'es' ? 'activas' : 'active'}
                      slices={Object.entries(subsByPlan).map(([plan, count]) => ({
                        label: plan.charAt(0).toUpperCase() + plan.slice(1),
                        value: count,
                        color: planColors[plan] || '#64748b',
                      }))}
                      onSliceClick={() => setActiveTab('subscriptions')}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: '#64748b' }}>{lang === 'es' ? 'Sin suscripciones' : 'No subscriptions'}</div>
                )}
              </div>

              {/* Credit Flow - DonutChart */}
              <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <SectionHeader
                  title={lang === 'es' ? 'Flujo de Cr\u00E9ditos' : 'Credit Flow'}
                  subtitle={lang === 'es' ? 'Movimiento total' : 'Total movement'}
                />
                {creditSummary ? (
                  <div className="flex justify-center">
                    <DonutChart
                      size={170}
                      centerValue={formatNumber(creditSummary.total_recharged + creditSummary.total_bonuses)}
                      centerLabel={lang === 'es' ? 'ingresados' : 'credited'}
                      slices={[
                        { label: lang === 'es' ? 'Recargados' : 'Recharged', value: creditSummary.total_recharged, color: '#22c55e' },
                        { label: lang === 'es' ? 'Bonos' : 'Bonuses', value: creditSummary.total_bonuses, color: '#f59e0b' },
                        { label: lang === 'es' ? 'Deducidos' : 'Deducted', value: creditSummary.total_deducted, color: '#ef4444' },
                        { label: lang === 'es' ? 'Reembolsados' : 'Refunded', value: creditSummary.total_refunded, color: '#a855f7' },
                      ].filter(s => s.value > 0)}
                      onSliceClick={() => setActiveTab('credits')}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: '#64748b' }}>{lang === 'es' ? 'Sin datos' : 'No data'}</div>
                )}
              </div>
            </div>

            {/* Recent Activity - Enhanced */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
                <h3 className="font-semibold text-white">{lang === 'es' ? 'Actividad Reciente' : 'Recent Activity'}</h3>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:text-white"
                  style={{ color: '#06b6d4', border: '1px solid #06b6d430' }}
                >
                  {lang === 'es' ? 'Ver todo' : 'View all'} {'\u2192'}
                </button>
              </div>
              <div className="divide-y" style={{ borderColor: '#1e293b' }}>
                {activity.length === 0 ? (
                  <div className="px-5 py-8 text-center" style={{ color: '#64748b' }}>
                    {lang === 'es' ? 'Sin actividad a\u00FAn' : 'No activity yet'}
                  </div>
                ) : (
                  activity.map((item, i) => (
                    <div key={i} className="px-3 sm:px-5 py-3 flex items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1e293b' }}>
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0" style={{ background: activityTypeColor(item.type) + '15' }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: activityTypeColor(item.type) }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ background: activityTypeColor(item.type) + '15', color: activityTypeColor(item.type) }}>
                              {activityTypeLabel(item.type)}
                            </span>
                            <span className="text-sm text-white truncate">{item.description}</span>
                          </div>
                          {item.email && <div className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{item.email}</div>}
                        </div>
                      </div>
                      <div className="text-xs flex-shrink-0 font-mono" style={{ color: '#64748b' }}>{timeAgo(item.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================
            USERS TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Stats Row */}
            {users.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Plan Distribution */}
                <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <SectionHeader title={lang === 'es' ? 'Distribuci\u00F3n por Plan' : 'Plan Distribution'} />
                  <DonutChart
                    size={150}
                    centerValue={String(users.length)}
                    centerLabel={lang === 'es' ? 'usuarios' : 'users'}
                    slices={planSlices()}
                  />
                </div>

                {/* Status Distribution */}
                <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <SectionHeader title={lang === 'es' ? 'Estado de Cuentas' : 'Account Status'} />
                  <DonutChart
                    size={150}
                    centerValue={String(users.filter(u => u.status === 'active').length)}
                    centerLabel={lang === 'es' ? 'activos' : 'active'}
                    slices={userStatusSlices()}
                  />
                </div>

                {/* Top Credit Holders */}
                <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <SectionHeader title={lang === 'es' ? 'Mayor Saldo de Cr\u00E9ditos' : 'Top Credit Holders'} />
                  <HorizontalBarChart
                    items={[...users]
                      .sort((a, b) => b.credit_balance - a.credit_balance)
                      .slice(0, 5)
                      .map(u => ({
                        label: u.email?.split('@')[0] || u.email,
                        value: u.credit_balance,
                        sublabel: u.plan_type,
                      }))}
                    formatValue={(v) => v.toLocaleString() + ' cr'}
                  />
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: '#1e293b' }}>
                <h3 className="font-semibold text-white">{lang === 'es' ? 'Usuarios Registrados' : 'Registered Users'}</h3>
                <span className="text-sm font-mono px-2 py-1 rounded" style={{ color: '#06b6d4', background: '#06b6d410' }}>{usersTotal} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Email</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Plan</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Cr\u00E9ditos' : 'Credits'}</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Status</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Registro' : 'Registered'}</th>
                      <th className="px-4 py-3 text-center font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Auditoría' : 'Audit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid #1e293b' }}>
                        <td className="px-4 py-3 text-white font-mono text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs font-semibold uppercase" style={{
                            background: (planColors[u.plan_type] || '#64748b') + '20',
                            color: planColors[u.plan_type] || '#64748b',
                          }}>{u.plan_type}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: '#06b6d4' }}>{u.credit_balance.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{
                            background: u.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: u.status === 'active' ? '#22c55e' : '#ef4444',
                          }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.status === 'active' ? '#22c55e' : '#ef4444' }} />
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs" style={{ color: '#64748b' }}>{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openAudit(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                            style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
                            title={lang === 'es' ? 'Ver auditoría de créditos' : 'View credit audit'}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
                            </svg>
                            {lang === 'es' ? 'Auditar' : 'Audit'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="px-5 py-8 text-center" style={{ color: '#64748b' }}>
                  {lang === 'es' ? 'Sin usuarios a\u00FAn' : 'No users yet'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================
            PAYMENTS TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Payment Stats */}
              {payments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {paymentKPIs().map(kpi => (
                  <div key={kpi.label} className="rounded-xl p-4 sm:p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                    <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>{kpi.label}</div>
                    <div className="text-xl sm:text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Status Chart + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Payment Status DonutChart */}
              {payments.length > 0 && (
                <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <SectionHeader title={lang === 'es' ? 'Estado de Pagos' : 'Payment Status'} />
                  <DonutChart
                    size={150}
                    centerValue={String(payments.length)}
                    centerLabel="total"
                    slices={paymentStatusSlices()}
                  />
                </div>
              )}

              {/* Payment Table */}
              <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: '#1e293b' }}>
                  <h3 className="font-semibold text-white">{lang === 'es' ? 'Pagos MercadoPago' : 'MercadoPago Payments'}</h3>
                  <span className="text-sm font-mono px-2 py-1 rounded" style={{ color: '#22c55e', background: '#22c55e10' }}>{paymentsTotal} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '650px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e293b' }}>
                        <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>ID</th>
                        <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Email</th>
                        <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Status</th>
                        <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Monto' : 'Amount'}</th>
                        <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid #1e293b' }}>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: '#64748b' }}>{p.payment_id}</td>
                          <td className="px-4 py-3 text-white text-xs">{p.payer_email || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{
                              background: p.status === 'approved' ? 'rgba(34,197,94,0.15)' : p.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                              color: p.status === 'approved' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#ef4444',
                            }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.status === 'approved' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#ef4444' }} />
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: '#22c55e' }}>
                            {formatMXN(parseFloat(p.amount || 0))} <span className="text-xs font-normal" style={{ color: '#64748b' }}>{p.currency}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs" style={{ color: '#64748b' }}>{formatDate(p.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {payments.length === 0 && (
                  <div className="px-5 py-8 text-center" style={{ color: '#64748b' }}>
                    {lang === 'es' ? 'Sin pagos a\u00FAn' : 'No payments yet'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================
            CREDITS TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'credits' && creditSummary && (
          <div className="space-y-6">
            {/* Credit KPI Cards + Gauges */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { label: lang === 'es' ? 'Recargados' : 'Recharged', value: creditSummary.total_recharged, color: '#22c55e' },
                { label: lang === 'es' ? 'Bonificaciones' : 'Bonuses', value: creditSummary.total_bonuses, color: '#f59e0b' },
                { label: lang === 'es' ? 'Deducidos' : 'Deducted', value: creditSummary.total_deducted, color: '#ef4444' },
                { label: lang === 'es' ? 'Reembolsados' : 'Refunded', value: creditSummary.total_refunded, color: '#a855f7' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-4 sm:p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>{kpi.label}</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value.toLocaleString()}</div>
                </div>
              ))}
              {/* Utilization Gauge */}
              <div className="rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <MiniGauge
                  value={creditSummary.total_deducted}
                  max={creditSummary.total_recharged + creditSummary.total_bonuses}
                  label={lang === 'es' ? 'Utilizaci\u00F3n' : 'Utilization'}
                  color="#06b6d4"
                />
              </div>
            </div>

            {/* Credit Flow Chart + Transaction Table */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Credit Flow DonutChart */}
              <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <SectionHeader
                  title={lang === 'es' ? 'Flujo de Cr\u00E9ditos' : 'Credit Flow'}
                  subtitle={lang === 'es' ? 'Entradas vs Salidas' : 'Inflow vs Outflow'}
                />
                <DonutChart
                  size={160}
                  centerValue={formatNumber(creditSummary.total_recharged + creditSummary.total_bonuses - creditSummary.total_deducted + creditSummary.total_refunded)}
                  centerLabel={lang === 'es' ? 'neto' : 'net'}
                  slices={[
                    { label: lang === 'es' ? 'Recargados' : 'Recharged', value: creditSummary.total_recharged, color: '#22c55e' },
                    { label: lang === 'es' ? 'Bonos' : 'Bonuses', value: creditSummary.total_bonuses, color: '#f59e0b' },
                    { label: lang === 'es' ? 'Deducidos' : 'Deducted', value: creditSummary.total_deducted, color: '#ef4444' },
                    { label: lang === 'es' ? 'Reembolsados' : 'Refunded', value: creditSummary.total_refunded, color: '#a855f7' },
                  ].filter(s => s.value > 0)}
                />
              </div>

              {/* Transaction Table */}
              <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: '#1e293b' }}>
                  <h3 className="font-semibold text-white">{lang === 'es' ? 'Transacciones Recientes' : 'Recent Transactions'}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: '#22c55e', background: '#22c55e10' }}>
                      +{formatNumber(creditSummary.total_recharged + creditSummary.total_bonuses)}
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: '#ef4444', background: '#ef444410' }}>
                      -{formatNumber(creditSummary.total_deducted)}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e293b' }}>
                        <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Tipo' : 'Type'}</th>
                        <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Descripci\u00F3n' : 'Description'}</th>
                        <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Cr\u00E9ditos' : 'Credits'}</th>
                        <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCredits.slice(0, 30).map((tx, i) => {
                        const txTypeColor = tx.type === 'recharge' ? '#22c55e' : tx.type === 'bonus' ? '#f59e0b' : tx.type === 'deduction' ? '#ef4444' : '#a855f7';
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid #1e293b' }}>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{
                                background: txTypeColor + '15',
                                color: txTypeColor,
                              }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: txTypeColor }} />
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: '#94a3b8' }}>{tx.description || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold" style={{ color: tx.type === 'deduction' ? '#ef4444' : '#22c55e' }}>
                              {tx.type === 'deduction' ? '-' : '+'}{parseFloat(tx.total_credits).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-xs" style={{ color: '#64748b' }}>{formatDate(tx.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {recentCredits.length === 0 && (
                  <div className="px-5 py-8 text-center" style={{ color: '#64748b' }}>
                    {lang === 'es' ? 'Sin transacciones a\u00FAn' : 'No transactions yet'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================
            SUBSCRIPTIONS TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Plan Distribution + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* DonutChart */}
              <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <SectionHeader title={lang === 'es' ? 'Por Plan' : 'By Plan'} />
                {Object.values(subsByPlan).some(v => v > 0) ? (
                  <DonutChart
                    size={150}
                    centerValue={String(Object.values(subsByPlan).reduce((a, b) => a + b, 0))}
                    centerLabel={lang === 'es' ? 'activas' : 'active'}
                    slices={Object.entries(subsByPlan).map(([plan, count]) => ({
                      label: plan.charAt(0).toUpperCase() + plan.slice(1),
                      value: count,
                      color: planColors[plan] || CHART_PALETTE[Object.keys(subsByPlan).indexOf(plan) % CHART_PALETTE.length],
                    }))}
                  />
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: '#64748b' }}>{lang === 'es' ? 'Sin suscripciones' : 'No subscriptions'}</div>
                )}
              </div>

              {/* Plan Cards */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['watch', 'guard', 'shield'].map((plan) => {
                  const count = subsByPlan[plan] || 0;
                  const total = Object.values(subsByPlan).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                  const color = planColors[plan];
                  return (
                    <div key={plan} className="rounded-xl p-5 relative overflow-hidden" style={{ background: '#111827', border: `1px solid ${color}30` }}>
                      {/* Background accent */}
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5" style={{ background: color, transform: 'translate(30%, -30%)' }} />
                      <div className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color }}>{plan}</div>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black font-mono" style={{ color }}>{count}</span>
                        <span className="text-sm mb-1" style={{ color: '#64748b' }}>{lang === 'es' ? 'activas' : 'active'}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.8 }} />
                      </div>
                      <div className="text-xs mt-1 text-right font-mono" style={{ color: '#64748b' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: '#1e293b' }}>
                <h3 className="font-semibold text-white">{lang === 'es' ? 'Todas las Suscripciones' : 'All Subscriptions'}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '500px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Email</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Plan</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Status</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Expira' : 'Expires'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid #1e293b' }}>
                        <td className="px-4 py-3 text-white text-xs font-mono">{(s as any).security_accounts?.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="uppercase font-bold text-xs px-2 py-1 rounded" style={{
                            color: planColors[s.plan_id] || '#f59e0b',
                            background: (planColors[s.plan_id] || '#f59e0b') + '15',
                          }}>{s.plan_id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{
                            background: s.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                            color: s.status === 'active' ? '#22c55e' : '#94a3b8',
                          }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.status === 'active' ? '#22c55e' : '#94a3b8' }} />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs" style={{ color: '#64748b' }}>{s.expires_at ? formatDate(s.expires_at) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {subscriptions.length === 0 && (
                <div className="px-5 py-8 text-center" style={{ color: '#64748b' }}>
                  {lang === 'es' ? 'Sin suscripciones a\u00FAn' : 'No subscriptions yet'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================
            REPORTS TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Reports Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Report Type DonutChart */}
              <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <SectionHeader title={lang === 'es' ? 'Por Tipo' : 'By Type'} />
                {Object.keys(reportsByType).length > 0 ? (
                  <DonutChart
                    size={150}
                    centerValue={String(Object.values(reportsByType).reduce((a, b) => a + b, 0))}
                    centerLabel="total"
                    slices={Object.entries(reportsByType).map(([type, count]) => ({
                      label: reportTypeLabel(type),
                      value: count,
                      color: reportTypeColor[type] || '#64748b',
                    }))}
                  />
                ) : (
                  <div className="text-center py-8 text-sm" style={{ color: '#64748b' }}>{lang === 'es' ? 'Sin datos' : 'No data'}</div>
                )}
              </div>

              {/* Report Type Cards */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { type: 'quick_scan', color: '#94a3b8' },
                    { type: 'audit', color: '#3b82f6' },
                    { type: 'compliance', color: '#8b5cf6' },
                    { type: 'simulation', color: '#f59e0b' },
                    { type: 'assessment', color: '#06b6d4' },
                  ].map(({ type, color }) => (
                    <div key={type} className="rounded-xl p-4 relative overflow-hidden" style={{ background: '#111827', border: `1px solid ${color}25` }}>
                      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-5" style={{ background: color, transform: 'translate(25%, -25%)' }} />
                      <div className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ color: '#94a3b8' }}>{reportTypeLabel(type)}</div>
                      <div className="text-2xl sm:text-3xl font-black font-mono" style={{ color }}>{reportsByType[type] || 0}</div>
                    </div>
                  ))}
                </div>

                {/* Report Status + Score Distribution */}
                {reports.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {/* Status Distribution */}
                    <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                      <SectionHeader title={lang === 'es' ? 'Por Estado' : 'By Status'} />
                      <DonutChart size={130} centerValue={String(reports.length)} centerLabel={lang === 'es' ? 'recientes' : 'recent'} slices={reportStatusSlices()} />
                    </div>

                    {/* Top Domains */}
                    <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                      <SectionHeader title={lang === 'es' ? 'Dominios M\u00E1s Escaneados' : 'Most Scanned Domains'} />
                      <HorizontalBarChart items={domainItems()} maxItems={5} formatValue={fmtReportes} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reports Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              {/* Header + Filters */}
              <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: '#1e293b' }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-semibold text-white">
                    {lang === 'es' ? 'Reportes Generados' : 'Generated Reports'}
                    {applyReportFilters(reports).length !== reports.length
                      ? <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded" style={{ background: '#06b6d420', color: '#06b6d4' }}>{applyReportFilters(reports).length} de {reports.length}</span>
                      : <span className="ml-2 text-xs font-normal" style={{ color: '#64748b' }}>{reports.length}</span>
                    }
                  </h3>
                  {/* Clear filters */}
                  {(reportSearch || reportTypeFilter !== 'all' || reportStatusFilter !== 'all') && (
                    <button
                      onClick={() => { setReportSearch(''); setReportTypeFilter('all'); setReportStatusFilter('all'); }}
                      className="text-xs px-2 py-1 rounded transition-colors hover:text-white"
                      style={{ color: '#64748b', border: '1px solid #1e293b' }}
                    >
                      {lang === 'es' ? 'Limpiar filtros' : 'Clear filters'}
                    </button>
                  )}
                </div>
                {/* Filter controls */}
                <div className="flex flex-wrap gap-2">
                  {/* Search */}
                  <div className="relative flex-1" style={{ minWidth: '180px', maxWidth: '320px' }}>
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder={lang === 'es' ? 'Buscar dominio o email…' : 'Search domain or email…'}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                      style={{ background: '#0d1117', border: '1px solid #1e293b', color: '#e2e8f0' }}
                    />
                  </div>
                  {/* Type filter */}
                  <select
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-lg outline-none"
                    style={{ background: '#0d1117', border: '1px solid #1e293b', color: reportTypeFilter !== 'all' ? '#06b6d4' : '#94a3b8' }}
                  >
                    <option value="all">{lang === 'es' ? 'Todos los tipos' : 'All types'}</option>
                    <option value="quick_scan">{lang === 'es' ? 'Escaneo Rápido' : 'Quick Scan'}</option>
                    <option value="audit">{lang === 'es' ? 'Auditoría' : 'Audit'}</option>
                    <option value="compliance">{lang === 'es' ? 'Cumplimiento' : 'Compliance'}</option>
                    <option value="simulation">{lang === 'es' ? 'Simulación' : 'Simulation'}</option>
                    <option value="assessment">{lang === 'es' ? 'Evaluación' : 'Assessment'}</option>
                  </select>
                  {/* Status filter */}
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-lg outline-none"
                    style={{ background: '#0d1117', border: '1px solid #1e293b', color: reportStatusFilter !== 'all' ? '#06b6d4' : '#94a3b8' }}
                  >
                    <option value="all">{lang === 'es' ? 'Todos los estados' : 'All statuses'}</option>
                    <option value="completed">{lang === 'es' ? 'Completado' : 'Completed'}</option>
                    <option value="failed">{lang === 'es' ? 'Fallido' : 'Failed'}</option>
                    <option value="processing">{lang === 'es' ? 'Procesando' : 'Processing'}</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Email</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Dominio' : 'Domain'}</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Tipo' : 'Type'}</th>
                      <th className="px-4 py-3 text-center font-medium" style={{ color: '#94a3b8' }}>Score</th>
                      <th className="px-4 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Status</th>
                      <th className="px-4 py-3 text-right font-medium" style={{ color: '#94a3b8' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applyReportFilters(reports).map((r) => {
                        const typeColor = reportTypeColor[r.report_type] || '#64748b';
                        return (
                          <tr key={r.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid #1e293b' }}>
                            <td className="px-4 py-3 text-white text-xs">{(r as any).security_accounts?.email || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: '#06b6d4' }}>{r.domain}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: typeColor + '15', color: typeColor }}>
                                {reportTypeLabel(r.report_type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.score !== null ? (
                                <span className="font-bold font-mono" style={{
                                  color: r.score >= 80 ? '#22c55e' : r.score >= 60 ? '#f59e0b' : '#ef4444'
                                }}>
                                  {r.score} <span className="text-xs opacity-70">({r.grade})</span>
                                </span>
                              ) : (
                                <span style={{ color: '#64748b' }}>-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium" style={{
                                background: r.status === 'completed' ? 'rgba(34,197,94,0.15)' : r.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                color: r.status === 'completed' ? '#22c55e' : r.status === 'failed' ? '#ef4444' : '#f59e0b',
                              }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{
                                  background: r.status === 'completed' ? '#22c55e' : r.status === 'failed' ? '#ef4444' : '#f59e0b',
                                }} />
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs" style={{ color: '#64748b' }}>{formatDate(r.created_at)}</td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
              {applyReportFilters(reports).length === 0 && (
                <div className="px-5 py-8 text-center" style={{ color: '#64748b' }}>
                  {reportSearch || reportTypeFilter !== 'all' || reportStatusFilter !== 'all'
                    ? (lang === 'es' ? 'Sin resultados para los filtros aplicados' : 'No results for the applied filters')
                    : (lang === 'es' ? 'Sin reportes aún' : 'No reports yet')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================
            ACTIVITY TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Activity Type Breakdown */}
            {activity.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <SectionHeader title={lang === 'es' ? 'Por Tipo' : 'By Type'} />
                  <DonutChart
                    size={150}
                    centerValue={String(activity.length)}
                    centerLabel={lang === 'es' ? 'eventos' : 'events'}
                    slices={activitySlices()}
                  />
                </div>

                {/* Activity Feed */}
                <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: '#1e293b' }}>
                    <h3 className="font-semibold text-white">{lang === 'es' ? 'Feed de Actividad' : 'Activity Feed'}</h3>
                  </div>
                  <div className="divide-y max-h-[600px] overflow-y-auto" style={{ borderColor: '#1e293b' }}>
                    {activity.map((item, i) => (
                      <div key={i} className="px-4 sm:px-5 py-3 flex items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1e293b' }}>
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0" style={{ background: activityTypeColor(item.type) + '15' }}>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: activityTypeColor(item.type) }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ background: activityTypeColor(item.type) + '15', color: activityTypeColor(item.type) }}>
                                {activityTypeLabel(item.type)}
                              </span>
                              <span className="text-sm text-white truncate">{item.description}</span>
                            </div>
                            {item.email && <div className="text-xs truncate mt-0.5" style={{ color: '#64748b' }}>{item.email}</div>}
                          </div>
                        </div>
                        <div className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: '#64748b' }}>{formatDate(item.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activity.length === 0 && (
              <div className="rounded-xl p-8 text-center" style={{ background: '#111827', border: '1px solid #1e293b', color: '#64748b' }}>
                {lang === 'es' ? 'Sin actividad a\u00FAn' : 'No activity yet'}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================
            LEADS TAB
        ====================================================================== */}
        {!tabLoading && activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Stats KPIs */}
            {leadsStats && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                <MetricCard
                  value={String(leadsStats.total)}
                  label={lang === 'es' ? 'Total Leads' : 'Total Leads'}
                  color="#3b82f6"
                />
                <MetricCard
                  value={String(leadsStats.by_status.new || 0)}
                  label={lang === 'es' ? 'Nuevos' : 'New'}
                  color="#10b981"
                />
                <MetricCard
                  value={String(leadsStats.by_status.contacted || 0)}
                  label={lang === 'es' ? 'Contactados' : 'Contacted'}
                  color="#f59e0b"
                />
                <MetricCard
                  value={String(leadsStats.by_status.qualified || 0)}
                  label={lang === 'es' ? 'Calificados' : 'Qualified'}
                  color="#8b5cf6"
                />
                <MetricCard
                  value={`${leadsStats.cloudflare_percentage}%`}
                  label={lang === 'es' ? 'Usan Cloudflare' : 'Use Cloudflare'}
                  color="#06b6d4"
                />
              </div>
            )}

            {/* Leads Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: '#1e293b' }}>
                <h3 className="font-semibold text-white">{lang === 'es' ? 'Solicitudes de Contacto' : 'Contact Requests'}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{lang === 'es' ? 'Nombre' : 'Name'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{lang === 'es' ? 'Empresa' : 'Company'}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{lang === 'es' ? 'Dominio' : 'Domain'}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>CF</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: '#64748b' }}>{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#1e293b' }}>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm text-white">{lead.name}</td>
                        <td className="px-4 py-3 text-sm truncate max-w-[200px]" style={{ color: '#94a3b8' }}>{lead.email}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#94a3b8' }}>{lead.company || '—'}</td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: '#94a3b8' }}>{lead.domain}</td>
                        <td className="px-4 py-3 text-center text-sm">
                          {lead.domain_uses_cloudflare === true ? '✅' : lead.domain_uses_cloudflare === false ? '❌' : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={lead.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              await updateLead(lead.id, { status: newStatus });
                              const updated = await getAdminLeads();
                              setLeads(updated.leads);
                              setLeadsStats(updated.stats);
                            }}
                            style={{
                              background: '#0a0a0f',
                              border: '1px solid #2a2a3a',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              color: lead.status === 'new' ? '#10b981' : lead.status === 'contacted' ? '#f59e0b' : lead.status === 'qualified' ? '#8b5cf6' : '#64748b',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="new" style={{ background: '#0a0a0f', color: '#10b981' }}>New</option>
                            <option value="contacted" style={{ background: '#0a0a0f', color: '#f59e0b' }}>Contacted</option>
                            <option value="qualified" style={{ background: '#0a0a0f', color: '#8b5cf6' }}>Qualified</option>
                            <option value="closed" style={{ background: '#0a0a0f', color: '#64748b' }}>Closed</option>
                            <option value="discarded" style={{ background: '#0a0a0f', color: '#ef4444' }}>Discarded</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setLeadNotes(lead.notes || '');
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid #2a2a3a',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              color: '#3b82f6',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            {lang === 'es' ? 'Ver' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leads.length === 0 && (
                <div className="p-8 text-center" style={{ color: '#64748b' }}>
                  {lang === 'es' ? 'Sin leads aún' : 'No leads yet'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          AUDIT MODAL
      ================================================================ */}
      {auditUser && (
        <div
          id="audit-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if ((e.target as HTMLElement).id === 'audit-modal-overlay') closeAudit(); }}
        >
          {/* Print styles */}
          <style>{`
            @media print {
              #audit-modal-overlay { position: static !important; background: white !important; backdrop-filter: none !important; padding: 0 !important; }
              #audit-modal-content { max-height: none !important; overflow: visible !important; box-shadow: none !important; border: none !important; background: white !important; color: black !important; width: 100% !important; max-width: 100% !important; }
              #audit-modal-content * { color: black !important; border-color: #ccc !important; background: white !important; }
              #audit-modal-close, #audit-pdf-btn { display: none !important; }
              #audit-print-header { display: block !important; }
              body > *:not(#audit-modal-overlay) { display: none !important; }
            }
            #audit-print-header { display: none; }
          `}</style>

          <div
            id="audit-modal-content"
            className="w-full rounded-2xl overflow-hidden flex flex-col"
            style={{
              maxWidth: '800px',
              maxHeight: '90vh',
              background: '#0d1117',
              border: '1px solid #1e293b',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header del modal */}
            <div className="flex items-start justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #1e293b' }}>
              <div>
                {/* Print-only header */}
                <div id="audit-print-header" style={{ marginBottom: '8px', fontSize: '11px', color: '#64748b' }}>
                  Anga Security — Reporte generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {lang === 'es' ? 'Auditoría de Créditos' : 'Credit Audit'}
                </h2>
                <p className="text-sm mt-0.5 font-mono" style={{ color: '#06b6d4' }}>{auditUser.email}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded font-semibold uppercase" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{auditUser.plan_type}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: auditUser.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: auditUser.status === 'active' ? '#22c55e' : '#ef4444' }}>{auditUser.status}</span>
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    {lang === 'es' ? 'Registro:' : 'Registered:'} {new Date(auditUser.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <button
                id="audit-modal-close"
                onClick={closeAudit}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10 flex-shrink-0"
                style={{ color: '#64748b' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {auditLoading && (
                <div className="flex items-center justify-center py-16">
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                </div>
              )}

              {!auditLoading && auditData && (
                <>
                  {/* RESUMEN */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
                      {lang === 'es' ? 'Resumen' : 'Summary'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: lang === 'es' ? 'Saldo Actual' : 'Current Balance', value: auditData.account.credit_balance.toLocaleString() + ' cr', color: '#06b6d4' },
                        { label: lang === 'es' ? 'Total Recargado' : 'Total Recharged', value: auditData.summary.total_recharged.toLocaleString() + ' cr', color: '#22c55e' },
                        { label: lang === 'es' ? 'Bonos' : 'Bonuses', value: auditData.summary.total_bonuses.toLocaleString() + ' cr', color: '#eab308' },
                        { label: lang === 'es' ? 'Total Gastado' : 'Total Spent', value: auditData.summary.total_spent.toLocaleString() + ' cr', color: '#ef4444' },
                        { label: lang === 'es' ? 'Reembolsado' : 'Refunded', value: auditData.summary.total_refunded.toLocaleString() + ' cr', color: '#3b82f6' },
                        { label: lang === 'es' ? 'Pagado en MXN' : 'Paid in MXN', value: `$${auditData.summary.total_paid_mxn.toLocaleString()} MXN`, color: '#8b5cf6' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                          <p className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</p>
                          <p className="text-base font-bold" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HISTORIAL DE TRANSACCIONES */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
                      {lang === 'es' ? 'Historial de Transacciones' : 'Transaction History'}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#1e293b', color: '#94a3b8' }}>{auditData.transactions.length}</span>
                    </h3>
                    {auditData.transactions.length === 0 ? (
                      <p className="text-sm" style={{ color: '#475569' }}>{lang === 'es' ? 'Sin transacciones' : 'No transactions'}</p>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#111827', borderBottom: '1px solid #1e293b' }}>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>Tipo</th>
                              <th className="px-4 py-2.5 text-right font-medium" style={{ color: '#64748b' }}>{lang === 'es' ? 'Créditos' : 'Credits'}</th>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>{lang === 'es' ? 'Descripción' : 'Description'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditData.transactions.map((tx: any) => {
                              const typeColors: Record<string, string> = { recharge: '#22c55e', bonus: '#eab308', deduction: '#ef4444', refund: '#3b82f6' };
                              const typeLabels: Record<string, string> = { recharge: lang === 'es' ? 'Recarga' : 'Recharge', bonus: 'Bonus', deduction: lang === 'es' ? 'Deducción' : 'Deduction', refund: lang === 'es' ? 'Reembolso' : 'Refund' };
                              const color = typeColors[tx.type] || '#94a3b8';
                              const sign = tx.type === 'deduction' ? '-' : '+';
                              return (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                  <td className="px-4 py-2.5 font-mono" style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {new Date(tx.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    {' '}
                                    <span style={{ color: '#475569' }}>{new Date(tx.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: color + '18', color }}>
                                      {typeLabels[tx.type] || tx.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color }}>
                                    {sign}{tx.total_credits.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2.5" style={{ color: '#94a3b8', maxWidth: '200px' }}>
                                    <span className="block truncate" title={tx.description}>{tx.description}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* PAGOS MERCADOPAGO */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
                      MercadoPago
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#1e293b', color: '#94a3b8' }}>{auditData.payments.length}</span>
                    </h3>
                    {auditData.payments.length === 0 ? (
                      <p className="text-sm" style={{ color: '#475569' }}>{lang === 'es' ? 'Sin pagos registrados' : 'No payments recorded'}</p>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#111827', borderBottom: '1px solid #1e293b' }}>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>Payment ID</th>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>Status</th>
                              <th className="px-4 py-2.5 text-right font-medium" style={{ color: '#64748b' }}>Monto</th>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>Paquete</th>
                              <th className="px-4 py-2.5 text-right font-medium" style={{ color: '#64748b' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditData.payments.map((p: any) => (
                              <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                <td className="px-4 py-2.5 font-mono" style={{ color: '#94a3b8' }}>{p.payment_id}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{
                                    background: p.status === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                                    color: p.status === 'approved' ? '#22c55e' : '#eab308',
                                  }}>{p.status}</span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: '#8b5cf6' }}>
                                  ${parseFloat(p.amount).toLocaleString()} {p.currency}
                                </td>
                                <td className="px-4 py-2.5" style={{ color: '#94a3b8' }}>
                                  {p.metadata?.package_id || '—'}{p.metadata?.credits ? ` (${parseInt(p.metadata.credits).toLocaleString()} cr)` : ''}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono" style={{ color: '#64748b' }}>
                                  {new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* REPORTES GENERADOS */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#64748b' }}>
                      {lang === 'es' ? 'Reportes Generados' : 'Generated Reports'}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#1e293b', color: '#94a3b8' }}>{auditData.reports.length}</span>
                    </h3>
                    {auditData.reports.length === 0 ? (
                      <p className="text-sm" style={{ color: '#475569' }}>{lang === 'es' ? 'Sin reportes generados' : 'No reports generated'}</p>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#111827', borderBottom: '1px solid #1e293b' }}>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>Tipo</th>
                              <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>Dominio</th>
                              <th className="px-4 py-2.5 text-right font-medium" style={{ color: '#64748b' }}>{lang === 'es' ? 'Créditos' : 'Credits'}</th>
                              <th className="px-4 py-2.5 text-right font-medium" style={{ color: '#64748b' }}>{lang === 'es' ? 'Fecha' : 'Date'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditData.reports.map((r: any) => {
                              const reportColors: Record<string, string> = { quick_scan: '#06b6d4', audit_basic: '#3b82f6', audit_pro: '#8b5cf6', audit_complete: '#ec4899', compliance: '#eab308', simulation: '#ef4444' };
                              const color = reportColors[r.type] || '#94a3b8';
                              return (
                                <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: color + '18', color }}>{r.type}</span>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono" style={{ color: '#94a3b8' }}>{r.domain || '—'}</td>
                                  <td className="px-4 py-2.5 text-right font-mono" style={{ color: r.credits_charged > 0 ? '#ef4444' : '#64748b' }}>
                                    {r.credits_charged > 0 ? `-${r.credits_charged.toLocaleString()}` : '0'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono" style={{ color: '#64748b' }}>
                                    {new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer con botón de PDF */}
            {!auditLoading && auditData && (
              <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #1e293b', background: '#0d1117' }}>
                <p className="text-xs" style={{ color: '#475569' }}>
                  {lang === 'es' ? 'Generado el' : 'Generated on'} {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <button
                  id="audit-pdf-btn"
                  onClick={() => exportAuditPDF()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  {lang === 'es' ? 'Exportar PDF' : 'Export PDF'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAD DETAIL MODAL */}
      {selectedLead && (
        <div
          id="lead-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if ((e.target as HTMLElement).id === 'lead-modal-overlay') setSelectedLead(null); }}
        >
          <div
            className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto"
            style={{ background: '#111827', border: '1px solid #1e293b' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#1e293b' }}>
              <h3 className="text-lg font-bold text-white">
                {lang === 'es' ? 'Detalle del Lead' : 'Lead Details'}
              </h3>
              <button onClick={() => setSelectedLead(null)} className="text-2xl" style={{ color: '#64748b' }}>×</button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{lang === 'es' ? 'Nombre' : 'Name'}</p>
                  <p className="text-sm text-white font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>Email</p>
                  <p className="text-sm text-white font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{lang === 'es' ? 'Empresa' : 'Company'}</p>
                  <p className="text-sm text-white font-medium">{selectedLead.company || '-'}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{lang === 'es' ? 'Dominio' : 'Domain'}</p>
                  <p className="text-sm text-white font-medium">{selectedLead.domain}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${selectedLead.domain_uses_cloudflare ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {selectedLead.domain_uses_cloudflare ? '✓ Cloudflare' : '✗ No Cloudflare'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${selectedLead.domain_exists ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                  {selectedLead.domain_exists ? (lang === 'es' ? 'Dominio existe' : 'Domain exists') : (lang === 'es' ? 'Dominio no existe' : 'Domain not found')}
                </span>
              </div>
              
              <div>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>{lang === 'es' ? 'Mensaje' : 'Message'}</p>
                <p className="text-sm p-3 rounded-lg" style={{ background: '#0a0a0f', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{selectedLead.message}</p>
              </div>
              
              <div>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>{lang === 'es' ? 'Notas internas' : 'Internal notes'}</p>
                <textarea
                  rows={3}
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: '#0a0a0f', border: '1px solid #1e293b', color: '#e2e8f0' }}
                  placeholder={lang === 'es' ? 'Agregar notas...' : 'Add notes...'}
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t" style={{ borderColor: '#1e293b' }}>
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: '#94a3b8', border: '1px solid #1e293b' }}
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
              <button
                disabled={savingLead}
                onClick={async () => {
                  setSavingLead(true);
                  try {
                    await updateLead(selectedLead.id, { notes: leadNotes });
                    const updated = await getAdminLeads();
                    setLeads(updated.leads);
                    setLeadsStats(updated.stats);
                    setNewLeadsCount(updated.stats?.by_status?.new || 0);
                    setSelectedLead(null);
                  } catch (err) {
                    console.error('Error saving lead:', err);
                  }
                  setSavingLead(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff' }}
              >
                {savingLead ? '...' : (lang === 'es' ? 'Guardar' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
