import { getSession } from './supabase';

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.angaflow.com';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function fetchJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((error as { error: string }).error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================
// Simulation (Attack Simulator)
// ============================================================

export const SIMULATION_CREDIT_COST = 3500;

// Multi-target types
export interface DiscoveredDomain {
  name: string;
  type: string;
  is_apex: boolean;
}

export interface TargetTestSummary {
  domain: string;
  is_apex: boolean;
  total_tests: number;
  blocked: number;
  challenged: number;
  bypassed: number;
  errors: number;
  score: number;
  grade: string;
  risk_level: string;
}

// Pre-check types
export interface AuditPreCheckResponse {
  can_run: boolean;
  zone_info: {
    zone_id: string;
    zone_name: string;
    cf_plan: string;
    zone_valid: boolean;
  };
  permissions: {
    available: string[];
    missing: string[];
    required_for_tier: string[];
    optional_for_tier: string[];
    missing_required: string[];
    missing_optional: string[];
    collectors_affected: number;
  };
  credits: {
    required: number;
    available: number;
    sufficient: boolean;
  };
  tier: string;
  blocked_reasons: string[];
}

export interface SimulationPreCheckResponse {
  can_run: boolean;
  zone_info: {
    zone_id: string;
    zone_name: string;
    cf_plan: string;
    zone_valid: boolean;
    domain_reachable: boolean;
  };
  permissions: {
    available: string[];
    missing: string[];
    required: string[];
    optional: string[];
    missing_required: string[];
    missing_optional: string[];
  };
  credits: {
    required: number;
    available: number;
    sufficient: boolean;
  };
  blocked_reasons: string[];
}

export async function auditPreCheck(
  zoneId: string,
  apiToken: string,
  tier: AuditTier,
  accountId?: string,
): Promise<AuditPreCheckResponse> {
  return fetchJSON<AuditPreCheckResponse>('/api/audit/pre-check', {
    method: 'POST',
    body: JSON.stringify({
      zone_id: zoneId,
      api_token: apiToken,
      tier,
      ...(accountId && { account_id: accountId }),
    }),
  });
}

export async function simulationPreCheck(
  zoneId: string,
  apiToken: string,
  accountId?: string,
): Promise<SimulationPreCheckResponse> {
  return fetchJSON<SimulationPreCheckResponse>('/api/simulation/pre-check', {
    method: 'POST',
    body: JSON.stringify({
      zone_id: zoneId,
      api_token: apiToken,
      ...(accountId && { account_id: accountId }),
    }),
  });
}

export async function getSimulationTargets(
  zoneId: string,
  apiToken: string,
): Promise<DiscoveredDomain[]> {
  const data = await fetchJSON<{ domains: DiscoveredDomain[] }>(
    `/api/simulation/targets?zone_id=${encodeURIComponent(zoneId)}&api_token=${encodeURIComponent(apiToken)}`,
  );
  return data.domains;
}

export async function startSimulation(
  zoneId: string,
  apiToken: string,
  accountId: string,
  options?: {
    domain?: string;
    domains?: string[];
  },
) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/simulation/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      zone_id: zoneId,
      api_token: apiToken,
      account_id: accountId,
      ...(options?.domain && { domain: options.domain }),
      ...(options?.domains && { domains: options.domains }),
    }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    const error: any = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.message = data.message || data.error;
    error.creditsRefunded = data.creditsRefunded;
    error.creditCost = data.creditCost;
    error.currentBalance = data.currentBalance;
    throw error;
  }

  return data as {
    success: boolean;
    report_id: string;
    status: 'running' | 'completed';
    credits_charged: number;
    new_balance: number;
    message?: string;
    report?: any;
  };
}

/**
 * Poll a simulation report until it reaches a terminal state (completed/failed).
 * Calls onStatus on each poll so the UI can update.
 * Returns the final report data on success, throws on failure.
 */
export async function pollSimulationStatus(
  reportId: string,
  opts?: {
    intervalMs?: number;
    maxAttempts?: number;
    onStatus?: (status: string, report: any) => void;
  },
): Promise<any> {
  const interval = opts?.intervalMs ?? 4000;
  const maxAttempts = opts?.maxAttempts ?? 90; // 90 * 4s = 6 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, interval));

    try {
      const { report } = await getSimulationReport(reportId);
      if (!report) continue;

      const status = report.status || report.data?.status;
      opts?.onStatus?.(status, report);

      if (status === 'completed' && report.data?.test_results) {
        return report;
      }
      if (status === 'failed') {
        const errMsg = report.data?.error || 'Simulation failed';
        const err: any = new Error(errMsg);
        err.status = 'failed';
        err.creditsRefunded = report.credits_charged === 0;
        err.report = report;
        throw err;
      }
      // status === 'running' \u2014 keep polling
    } catch (err: any) {
      // Re-throw failure errors (from above)
      if (err.status === 'failed') throw err;
      // Network errors: keep trying
      console.warn(`Poll attempt ${attempts} failed:`, err.message);
    }
  }

  // Exhausted all attempts
  const err: any = new Error('Simulation polling timed out. The simulation may still be running.');
  err.status = 'timeout';
  err.reportId = reportId;
  throw err;
}

export async function getSimulationReport(id: string) {
  return fetchJSON<{ report: any }>(`/api/simulation/${id}`);
}

export async function getSimulationHistory(limit = 20, offset = 0) {
  return fetchJSON<{
    reports: Array<{
      id: string;
      domain: string;
      report_type: string;
      zone_id: string | null;
      score: number | null;
      grade: string | null;
      risk_level: string | null;
      total_tests: number;
      bypassed: number;
      findings_count: number;
      duration_ms: number;
      status: string;
      credits_charged: number;
      created_at: string;
      completed_at: string | null;
    }>;
    total: number;
  }>(`/api/simulation/history?limit=${limit}&offset=${offset}`);
}

// Account
export async function getAccount() {
  return fetchJSON<{
    account: {
      id: string;
      email: string;
      display_name: string | null;
      plan_type: string;
      credit_balance: number;
      free_scans_used: number;
      first_reload_bonus_claimed: boolean;
      status: string;
      created_at: string;
    };
    subscription: any;
    report_count: number;
  }>('/api/account');
}

export async function createAccount() {
  return fetchJSON<{ account: any }>('/api/account', { method: 'POST' });
}

// Credits
export async function getCreditBalance() {
  return fetchJSON<{
    credit_balance: number;
    free_scans_used: number;
    first_reload_bonus_available: boolean;
  }>('/api/credits/balance');
}

export async function getTransactions(limit = 20, offset = 0) {
  return fetchJSON<{
    transactions: any[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/credits/transactions?limit=${limit}&offset=${offset}`);
}

// Payments
export async function createCheckout(type: 'credit_recharge' | 'subscription', params: {
  package_id?: string;
  plan_id?: string;
}) {
  return fetchJSON<{
    preference_id: string;
    checkout_url: string;
  }>('/api/payments/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ type, ...params }),
  });
}

export async function getPublicKey() {
  return fetchJSON<{ public_key: string }>('/api/payments/public-key');
}

// Admin
export async function getAdminStats() {
  return fetchJSON<{
    total_users: number;
    total_revenue_mxn: number;
    total_credits_sold: number;
    active_subscriptions: number;
    total_reports: number;
  }>('/api/admin/stats');
}

export async function getAdminUsers(limit = 50, offset = 0) {
  return fetchJSON<{ users: any[]; total: number }>(`/api/admin/users?limit=${limit}&offset=${offset}`);
}

export async function getAdminPayments(limit = 50, offset = 0) {
  return fetchJSON<{ payments: any[]; total: number; total_revenue_mxn: number }>(`/api/admin/payments?limit=${limit}&offset=${offset}`);
}

export async function getAdminCredits() {
  return fetchJSON<{ summary: any; recent_transactions: any[] }>('/api/admin/credits');
}

export async function getAdminSubscriptions() {
  return fetchJSON<{ subscriptions: any[]; active_count: number; by_plan: Record<string, number> }>('/api/admin/subscriptions');
}

export async function getAdminReports(limit = 50, offset = 0) {
  return fetchJSON<{ reports: any[]; total: number; by_type: Record<string, number> }>(`/api/admin/reports?limit=${limit}&offset=${offset}`);
}

export async function getAdminActivity() {
  return fetchJSON<{ activity: any[] }>('/api/admin/activity');
}

export async function getAdminLeads(status = 'all', limit = 50, offset = 0) {
  const params = new URLSearchParams({
    status,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetchJSON<{
    leads: any[];
    total: number;
    stats: {
      total: number;
      by_status: Record<string, number>;
      cloudflare_percentage: number;
    };
  }>(`/api/admin/leads?${params}`);
}

export async function updateLead(leadId: string, updates: { status?: string; notes?: string }) {
  return fetchJSON<{ lead: any }>(`/api/admin/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ============================================================
// Scan
// ============================================================

export async function startQuickScan(domain: string) {
  return fetchJSON<{
    success: boolean;
    report: {
      reportId: string;
      domain: string;
      overallScore: number;
      overallGrade: string;
      categories: Array<{
        category: string;
        label: string;
        score: number;
        grade: string;
        weight: number;
        weightedScore: number;
        checks: Array<{
          name: string;
          status: 'pass' | 'warn' | 'fail' | 'info';
          value: string;
          description: string;
          maxPoints: number;
          earnedPoints: number;
        }>;
        additionalChecksInAudit: number;
        auditBenefitHint: string;
      }>;
      recommendations: Array<{
        priority: string;
        category: string;
        title: string;
        description: string;
        requiresAudit: boolean;
        auditUpsellText?: string;
      }>;
      upsell: {
        quickScanChecks: number;
        auditChecks: number;
        categoriesUnlocked: string[];
        ctaText: { es: string; en: string };
      };
      scannedAt: string;
      durationMs: number;
    };
  }>('/api/scan/quick', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });
}

export async function getScanReport(id: string) {
  return fetchJSON<{ report: any }>(`/api/scan/${id}`);
}

export async function getScanHistory(limit = 20, offset = 0) {
  return fetchJSON<{
    reports: Array<{
      id: string;
      domain: string;
      report_type: string;
      score: number | null;
      grade: string | null;
      status: string;
      credits_charged: number;
      created_at: string;
      completed_at: string | null;
    }>;
    total: number;
    limit: number;
    offset: number;
    freeScans: {
      used: number;
      limit: number;
      resetsAt: string;
    };
  }>(`/api/scan/history?limit=${limit}&offset=${offset}`);
}

// ============================================================
// Audit
// ============================================================

export type AuditTier = 'basic' | 'pro' | 'complete';

export interface AuditCategoryScore {
  category: string;
  label: { es: string; en: string };
  weight: number;
  score: number;
  weighted_score: number;
  findings: string[];
  grade: string;
  plan_limited: boolean;
  plan_note?: string;
}

export interface AuditRecommendation {
  priority: 'critical' | 'high' | 'medium';
  category: string;
  title: string;
  description: string;
  product?: string;
  estimated_value?: string;
  min_plan?: string;
}

export interface AuditReport {
  version: string;
  tier: AuditTier;
  tier_id: string;
  zone_id: string;
  zone_name: string;
  cf_plan: string;
  generated_at: string;
  duration_ms: number;
  analysis_period: { start: string; end: string };
  score: {
    overall_score: number;
    overall_grade: string;
    categories: AuditCategoryScore[];
    effective_weight_sum: number;
  };
  data: any;
  recommendations: AuditRecommendation[];
  collectors_run: number;
  collectors_skipped: number;
  collectors_warned: number;
}

export interface StartAuditResponse {
  success: boolean;
  report_id: string;
  tier: AuditTier;
  credits_charged: number;
  report: AuditReport;
}

export async function startAudit(zoneId: string, apiToken: string, tier: AuditTier) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/audit/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ zone_id: zoneId, api_token: apiToken, tier }),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    // Attach extra context for specific error types
    const error: any = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.message = data.message || data.error;
    error.creditsRefunded = data.creditsRefunded;
    error.creditCost = data.creditCost;
    error.currentBalance = data.currentBalance;
    throw error;
  }

  return data as StartAuditResponse;
}

export async function getAuditReport(id: string) {
  return fetchJSON<{ report: any }>(`/api/audit/${id}`);
}

export async function getAuditHistory(limit = 20, offset = 0) {
  return fetchJSON<{
    reports: Array<{
      id: string;
      domain: string;
      report_type: string;
      score: number | null;
      grade: string | null;
      status: string;
      credits_charged: number;
      created_at: string;
      completed_at: string | null;
    }>;
    total: number;
  }>(`/api/audit/history?limit=${limit}&offset=${offset}`);
}

export async function getComplianceHistory(limit = 20, offset = 0) {
  return fetchJSON<{
    reports: Array<{
      id: string;
      domain: string;
      report_type: string;
      score: number | null;
      grade: string | null;
      status: string;
      credits_charged: number;
      created_at: string;
      completed_at: string | null;
      parent_report_id: string | null;
    }>;
    total: number;
  }>(`/api/compliance/history?limit=${limit}&offset=${offset}`);
}

export const AUDIT_TIER_INFO = {
  basic: { credits: 1500, collectors: 5, categories: 5, time: '~5-10s' },
  pro: { credits: 3000, collectors: 12, categories: 8, time: '~15-20s' },
  complete: { credits: 5000, collectors: 17, categories: 8, time: '~25-30s' },
} as const;

// ============================================================
// Compliance
// ============================================================

export type ComplianceFramework =
  | 'pci_dss_4'
  | 'iso_27001'
  | 'soc2_type2'
  | 'lfpdppp'
  | 'gdpr'
  | 'nist_800_53'
  | 'nist_csf'
  | 'infra_baseline';

export const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  'pci_dss_4',
  'iso_27001',
  'soc2_type2',
  'lfpdppp',
  'gdpr',
  'nist_800_53',
  'nist_csf',
  'infra_baseline',
];

export const COMPLIANCE_FRAMEWORK_INFO: Record<ComplianceFramework, {
  name: string;
  credits: number;
  label: { es: string; en: string };
  tooltip: { es: string; en: string };
}> = {
  pci_dss_4: {
    name: 'PCI DSS 4.0',
    credits: 800,
    label: { es: 'PCI DSS 4.0', en: 'PCI DSS 4.0' },
    tooltip: {
      es: 'Estandar de seguridad para procesamiento de tarjetas de credito y pagos',
      en: 'Security standard for credit card processing and payments'
    }
  },
  iso_27001: {
    name: 'ISO 27001:2022',
    credits: 800,
    label: { es: 'ISO 27001:2022', en: 'ISO 27001:2022' },
    tooltip: {
      es: 'Sistema de gestion de seguridad de la informacion reconocido internacionalmente',
      en: 'Internationally recognized information security management system'
    }
  },
  soc2_type2: {
    name: 'SOC 2 Type II',
    credits: 800,
    label: { es: 'SOC 2 Type II', en: 'SOC 2 Type II' },
    tooltip: {
      es: 'Controles de seguridad, disponibilidad y confidencialidad para empresas SaaS',
      en: 'Security, availability, and confidentiality controls for SaaS companies'
    }
  },
  lfpdppp: {
    name: 'LFPDPPP',
    credits: 500,
    label: { es: 'LFPDPPP (Mexico)', en: 'LFPDPPP (Mexico)' },
    tooltip: {
      es: 'Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares (Mexico)',
      en: 'Federal Law on Protection of Personal Data Held by Private Parties (Mexico)'
    }
  },
  gdpr: {
    name: 'GDPR',
    credits: 800,
    label: { es: 'RGPD (UE)', en: 'GDPR (EU)' },
    tooltip: {
      es: 'Reglamento General de Proteccion de Datos de la Union Europea',
      en: 'European Union General Data Protection Regulation'
    }
  },
  nist_800_53: {
    name: 'NIST SP 800-53',
    credits: 800,
    label: { es: 'NIST SP 800-53 Rev 5', en: 'NIST SP 800-53 Rev 5' },
    tooltip: {
      es: 'Marco de controles de seguridad del gobierno federal de EE.UU. (NIST)',
      en: 'U.S. federal government security controls framework (NIST)'
    }
  },
  nist_csf: {
    name: 'NIST CSF 2.0',
    credits: 700,
    label: { es: 'NIST CSF 2.0', en: 'NIST CSF 2.0' },
    tooltip: {
      es: 'Marco de ciberseguridad para identificar, proteger, detectar, responder y recuperarse',
      en: 'Cybersecurity framework to identify, protect, detect, respond, and recover'
    }
  },
  infra_baseline: {
    name: 'Infra Baseline',
    credits: 600,
    label: { es: 'Infra Baseline (Anga)', en: 'Infra Baseline (Anga)' },
    tooltip: {
      es: 'Checklist de seguridad de infraestructura Cloudflare (TLS, WAF, DNS, Headers)',
      en: 'Cloudflare infrastructure security checklist (TLS, WAF, DNS, Headers)'
    }
  },
};

export const COMPLIANCE_BUNDLE_CREDITS = 2500;
export const COMPLIANCE_BUNDLE_8_CREDITS = 3800;

export type ControlStatus =
  | 'pass'
  | 'fail'
  | 'partial'
  | 'not_applicable'
  | 'manual_required'
  | 'insufficient_permissions';

export type ControlSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BiStr {
  es: string;
  en: string;
}

export interface CrossFrameworkRecommendation {
  data_point: string;
  priority_score: number;
  frameworks_impacted: number;
  failed_frameworks: number;
  effort_estimate: 'minutes' | 'hours' | 'days';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  ai_insight: BiStr;
  quick_win: boolean;
  can_autofix: boolean;
  recommendation: BiStr;
  business_impact: BiStr;
  technical_details: string;
  related_control_ids: string[];
}

export interface ControlResult {
  control_id: string;
  control_ref: string;
  title: BiStr;
  description: BiStr;
  regulatory_reference: {
    framework_name: string;
    section: BiStr;
    clause: string;
    official_text: BiStr;
    applicability_note: BiStr;
    source_url?: string;
  };
  status: ControlStatus;
  severity: ControlSeverity;
  score: number;
  evaluation_method: 'automated' | 'partial' | 'manual_flag';
  evidence: {
    data_sources: string[];
    current_value: string;
    expected_value: string;
    details: string;
    raw_data?: any;
  };
  remediation: {
    summary: BiStr;
    risk_if_ignored: BiStr;
    steps: {
      order: number;
      action: BiStr;
      where: BiStr;
      detail: BiStr;
    }[];
    cloudflare_doc_url: string;
    estimated_effort: 'minutes' | 'hours' | 'days';
    requires_plan_upgrade: boolean;
    min_plan?: string;
    can_be_automated: boolean;
  };
  cross_references: {
    framework: ComplianceFramework;
    control_id: string;
    clause: string;
  }[];
  manual_checklist?: {
    verified: boolean;
    verified_by?: string;
    verified_at?: string;
    notes?: string;
  };
  evaluated_at: string;
}

export interface ComplianceSection {
  id: string;
  title: BiStr;
  description: BiStr;
  controls: ControlResult[];
  section_score: number;
  section_grade: string;
  passed: number;
  failed: number;
  partial: number;
  manual: number;
  not_applicable: number;
  insufficient_permissions: number;
}

export interface FrameworkResult {
  framework: ComplianceFramework;
  framework_info: {
    name: string;
    version: string;
    full_name: BiStr;
    region: BiStr;
    source_url: string;
    issuing_body: string;
  };
  sections: ComplianceSection[];
  framework_score: number;
  framework_grade: string;
  summary: {
    total_controls: number;
    passed: number;
    failed: number;
    partial: number;
    not_applicable: number;
    manual_required: number;
    insufficient_permissions: number;
  };
}

export interface ComplianceReport {
  version: string;
  frameworks: ComplianceFramework[];
  is_bundle: boolean;
  source_audit_id: string;
  source_audit_tier: AuditTier;
  zone_name: string;
  zone_id: string;
  cf_plan: string;
  generated_at: string;
  duration_ms: number;
  analysis_period: { start: string; end: string };
  compliance_score: number;
  compliance_grade: string;
  summary: {
    total_controls: number;
    passed: number;
    failed: number;
    partial: number;
    not_applicable: number;
    manual_required: number;
    insufficient_permissions: number;
    coverage_pct: number;
  };
  framework_results: FrameworkResult[];
  cross_framework_matrix?: {
    data_point: string;
    cloudflare_setting: string;
    current_value: string;
    frameworks_covered: {
      framework: ComplianceFramework;
      control_id: string;
      status: ControlStatus;
    }[];
  }[];
  cross_framework_recommendations?: CrossFrameworkRecommendation[];
  executive_summary: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    key_findings: BiStr[];
    strengths: BiStr[];
    immediate_actions: BiStr[];
    estimated_remediation_hours: number;
  };
  token_audit: {
    permissions_available: string[];
    permissions_missing: string[];
    controls_limited_by_permissions: number;
  };
  source_audit_age_days: number;
  staleness_warning: boolean;
  disclaimer: BiStr;
  collectors_run: number;
  collectors_failed: number;
}

export interface PreCheckResponse {
  can_run: boolean;
  source_audit: {
    id: string;
    tier: AuditTier;
    zone_name: string;
    age_days: number;
    is_stale: boolean;
  };
  token_permissions: {
    available: string[];
    missing: string[];
    controls_limited: number;
  };
  credits_required: number;
  credits_available: number;
  insufficient_credits: boolean;
}

export interface CompliancePreviewControl {
  framework: ComplianceFramework;
  framework_name: string;
  control_id: string;
  title: BiStr;
  clause: string;
  status: ControlStatus;
  severity: ControlSeverity;
  current_value: string;
  expected_value: string;
}

// API Functions

export async function compliancePreCheck(
  auditId: string,
  apiToken: string,
  accountId: string,
  frameworks?: ComplianceFramework[] | 'bundle',
) {
  return fetchJSON<PreCheckResponse>(`/api/compliance/pre-check/${auditId}`, {
    method: 'POST',
    body: JSON.stringify({
      api_token: apiToken,
      account_id: accountId,
      frameworks: frameworks || 'bundle',
    }),
  });
}

export async function runCompliance(
  sourceAuditId: string,
  zoneId: string,
  apiToken: string,
  accountId: string,
  frameworks: ComplianceFramework[] | 'bundle',
) {
  const headers = await getAuthHeaders();
  const fws = frameworks === 'bundle' ? COMPLIANCE_FRAMEWORKS : frameworks;
  const response = await fetch(`${API_URL}/api/compliance/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_audit_id: sourceAuditId,
      zone_id: zoneId,
      api_token: apiToken,
      account_id: accountId,
      frameworks: fws,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) {
    const error: any = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.message = data.message || data.error;
    error.credits_required = data.credits_required;
    error.credits_available = data.credits_available;
    throw error;
  }

  return data as {
    success: boolean;
    report_id: string;
    frameworks: ComplianceFramework[];
    credits_charged: number;
    report: ComplianceReport;
  };
}

// ════════════════════════════════════════════════════════════════════
// Direct Compliance API (No Audit Source)
// ════════════════════════════════════════════════════════════════════

export interface DirectCompliancePreCheckResponse {
  can_run: boolean;
  mode: 'direct';
  tier: 'pro' | 'complete';
  zone_id: string;
  token_permissions: {
    available: string[];
    missing: string[];
    controls_limited: number;
  };
  cost_breakdown: {
    audit_tier: string;
    audit_cost: number;
    frameworks: string;
    compliance_cost: number;
    discount: number;
    total: number;
  };
  credits_required: number;
  credits_available: number;
  insufficient_credits: boolean;
}

export interface DirectComplianceRunResponse {
  success: boolean;
  report_id: string;
  mode: 'direct';
  tier: 'pro' | 'complete';
  frameworks: string[];
  credits_charged: number;
  report: ComplianceReport;
}

export async function compliancePreCheckDirect(
  zoneId: string,
  apiToken: string,
  accountId: string,
  tier: 'pro' | 'complete',
  frameworks: ComplianceFramework[] | 'bundle' | 'bundle_8',
): Promise<DirectCompliancePreCheckResponse> {
  return fetchJSON<DirectCompliancePreCheckResponse>(`/api/compliance/pre-check-direct`, {
    method: 'POST',
    body: JSON.stringify({
      zone_id: zoneId,
      api_token: apiToken,
      account_id: accountId,
      tier,
      frameworks,
    }),
  });
}

export async function runComplianceDirect(
  zoneId: string,
  apiToken: string,
  accountId: string,
  tier: 'pro' | 'complete',
  frameworks: ComplianceFramework[] | 'bundle' | 'bundle_8',
): Promise<DirectComplianceRunResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/compliance/run-direct`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      zone_id: zoneId,
      api_token: apiToken,
      account_id: accountId,
      tier,
      frameworks,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) {
    const error: any = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.message = data.message || data.error;
    error.credits_required = data.credits_required;
    error.credits_available = data.credits_available;
    throw error;
  }

  return data as DirectComplianceRunResponse;
}

export async function getComplianceReport(id: string) {
  return fetchJSON<{ report: any }>(`/api/compliance/${id}`);
}

export async function updateManualChecklist(
  reportId: string,
  controlId: string,
  framework: ComplianceFramework,
  verified: boolean,
  notes?: string,
) {
  return fetchJSON<{
    success: boolean;
    control_id: string;
    framework: ComplianceFramework;
    manual_checklist: {
      verified: boolean;
      verified_by: string;
      verified_at: string;
      notes?: string;
    };
  }>('/api/compliance/checklist', {
    method: 'PATCH',
    body: JSON.stringify({
      report_id: reportId,
      control_id: controlId,
      framework,
      verified,
      notes,
    }),
  });
}

// ════════════════════════════════════════════════════════════════════
// Anga AutoFix - Premium Auto-Remediation Service
// ════════════════════════════════════════════════════════════════════

export const AUTOFIX_CREDITS_PER_FIX = 500;

export interface RemediationAction {
  action_id: string;
  control_id: string;
  control_ref: string;
  title: BiStr;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint: string;
  body: any;
  expected_response_code: number;
  required_permissions: string[];
  requires_plan: 'free' | 'pro' | 'business' | 'enterprise';
  safe_to_automate: boolean;
  credit_cost: number;
  current_value: string;
  new_value: string;
  impact_description: BiStr;
  risk_level: 'low' | 'medium' | 'high';
  reversible: boolean;
  rollback_endpoint?: string;
  rollback_body?: any;
  frameworks_affected: string[];
}

export interface RemediationPreviewResponse {
  zone_id: string;
  zone_name: string;
  actions: RemediationAction[];
  total_cost: number;
  estimated_duration: string;
  permissions_check: {
    all_permissions_available: boolean;
    missing_permissions: string[];
  };
  plan_check: {
    current_plan: string;
    plan_upgrade_required: boolean;
    required_plan?: string;
  };
  warnings: string[];
  summary: {
    total_actions: number;
    quick_fixes: number;
    high_risk: number;
    irreversible: number;
  };
  credits_available?: number; // Added by frontend after preview
}

export interface RemediationExecutionResult {
  action_id: string;
  control_id: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  api_response?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
}

export interface RemediationExecutionResponse {
  execution_id: string;
  started_at: string;
  completed_at: string;
  results: RemediationExecutionResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
  credits_charged: number;
  credits_refunded: number;
  recommendations: string[];
}

export interface RemediationLogEntry {
  execution_id: string;
  zone_id: string;
  zone_name: string;
  actions_executed: number;
  actions_succeeded: number;
  actions_failed: number;
  credits_charged: number;
  credits_refunded: number;
  status: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Preview available remediation actions for a compliance report
 * This is free and doesn't charge credits
 */
export async function previewRemediation(
  reportId: string,
  zoneId: string,
  apiToken: string,
): Promise<RemediationPreviewResponse> {
  return fetchJSON<RemediationPreviewResponse>('/api/remediation/preview', {
    method: 'POST',
    body: JSON.stringify({
      report_id: reportId,
      zone_id: zoneId,
      api_token: apiToken,
    }),
  });
}

/**
 * Execute remediation actions (charges credits)
 */
export async function executeRemediation(
  reportId: string,
  zoneId: string,
  zoneName: string,
  apiToken: string,
  actionIds: string[],
  totalCostConfirmed: number,
): Promise<RemediationExecutionResponse> {
  return fetchJSON<RemediationExecutionResponse>('/api/remediation/execute', {
    method: 'POST',
    body: JSON.stringify({
      report_id: reportId,
      zone_id: zoneId,
      zone_name: zoneName,
      api_token: apiToken,
      action_ids: actionIds,
      total_cost_confirmed: totalCostConfirmed,
    }),
  });
}

/**
 * Get remediation history for the account
 */
export async function getRemediationHistory(
  limit?: number,
  offset?: number,
): Promise<{ history: RemediationLogEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchJSON<{ history: RemediationLogEntry[]; total: number }>(`/api/remediation/history${query}`);
}

/**
 * Get details of a specific remediation execution
 */
export async function getRemediationExecution(
  executionId: string,
): Promise<RemediationExecutionResponse & { actions: RemediationAction[] }> {
  return fetchJSON<RemediationExecutionResponse & { actions: RemediationAction[] }>(
    `/api/remediation/execution/${executionId}`
  );
}

// ============================================================
// Admin: Auditoría de créditos por usuario
// ============================================================
export async function getAdminUserAudit(accountId: string) {
  return fetchJSON<{
    account: {
      id: string;
      user_id: string;
      email: string;
      display_name: string | null;
      plan_type: string;
      credit_balance: number;
      free_scans_used: number;
      status: string;
      created_at: string;
    };
    transactions: {
      id: string;
      type: 'recharge' | 'bonus' | 'deduction' | 'refund';
      total_credits: number;
      amount: number | null;
      bonus: number | null;
      description: string;
      report_id: string | null;
      created_at: string;
    }[];
    payments: {
      id: string;
      payment_id: string;
      status: string;
      amount: number;
      currency: string;
      payer_email: string;
      payment_type: string;
      metadata: any;
      created_at: string;
    }[];
    reports: {
      id: string;
      type: string;
      domain: string;
      credits_charged: number;
      created_at: string;
    }[];
    summary: {
      total_recharged: number;
      total_bonuses: number;
      total_spent: number;
      total_refunded: number;
      total_paid_mxn: number;
      payment_count: number;
    };
  }>(`/api/admin/users/${accountId}/audit`);
}
