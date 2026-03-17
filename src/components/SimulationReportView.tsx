/**
 * SimulationReportView.tsx \u2014 4-tab report viewer for Attack Simulator results.
 *
 * FASE 1: biStr() on all bilingual fields, error boundary in Dashboard.tsx
 * FASE 2: phase_durations, enriched TestResultCard (cf_product, dashboard_path,
 *         docs_url, effort, linked_finding_id, body_preview, rule_description,
 *         owasp_score, waf_attack_score), interactive recommendations
 * FASE 3: copyToClipboard with feedback, WAF rule generator, bulk action banners,
 *         CF Dashboard deep-links, Actionable vs Upgrade findings, no-print CSS
 *
 * No emoji literals \u2014 all icons use Unicode escapes.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Speedometer,
  DonutChart,
  SectionHeader,
  MetricCard,
} from './AuditCharts';
import type { DonutSlice } from './AuditCharts';

// \u2500\u2500\u2500 Safe Icon Constants (no raw emoji) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const IC = {
  back: '\u2190',
  arrow: '\u2192',
  check: '\u2713',
  cross: '\u2717',
  warning: '\u26A0\uFE0F',
  shield: '\uD83D\uDEE1\uFE0F',
  lock: '\uD83D\uDD12',
  search: '\uD83D\uDD0D',
  chart: '\uD83D\uDCCA',
  bulb: '\uD83D\uDCA1',
  target: '\uD83C\uDFAF',
  fire: '\uD83D\uDD25',
  gear: '\u2699\uFE0F',
  clock: '\uD83D\uDD52',
  link: '\uD83D\uDD17',
  doc: '\uD83D\uDCC3',
  eye: '\uD83D\uDC41\uFE0F',
  globe: '\uD83C\uDF10',
  brain: '\uD83E\uDDE0',
  roadmap: '\uD83D\uDDFA\uFE0F',
  dot: '\u25CF',
  dash: '\u2014',
  chevDown: '\u25BC',
  external: '\u2197',
  module: '\uD83D\uDCE6',
  test: '\uD83E\uDDEA',
  blocked: '\uD83D\uDEAB',
  bug: '\uD83D\uDC1B',
  wrench: '\uD83D\uDD27',
  star: '\u2605',
  phase: '\uD83D\uDCC5',
  copy: '\uD83D\uDCCB',
  zap: '\u26A1',
  code: '\uD83D\uDCBB',
  info: '\u2139\uFE0F',
  up: '\u2191',
};

// \u2500\u2500\u2500 Theme Colors \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const C = {
  bg: '#0a0a0f',
  card: '#111827',
  card2: '#0f172a',
  border: '#1e293b',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

// \u2500\u2500\u2500 Module Colors \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const MODULE_COLORS: Record<string, string> = {
  waf_bypass: '#ef4444',
  rate_limit: '#f59e0b',
  bot_evasion: '#8b5cf6',
  custom_rule_bypass: '#06b6d4',
  ip_geo_access: '#10b981',
  ssl_tls: '#3b82f6',
  cache_poisoning: '#ec4899',
  api_security: '#f97316',
  challenge_analysis: '#64748b',
};

const MODULE_NAMES: Record<string, { es: string; en: string }> = {
  waf_bypass: { es: 'WAF Bypass / OWASP', en: 'WAF Bypass / OWASP' },
  rate_limit: { es: 'Rate Limiting / DDoS', en: 'Rate Limiting / DDoS' },
  bot_evasion: { es: 'Evasi\u00f3n de Bots', en: 'Bot Evasion' },
  custom_rule_bypass: { es: 'Bypass Reglas Custom', en: 'Custom Rule Bypass' },
  ip_geo_access: { es: 'Control IP/Geo', en: 'IP/Geo Control' },
  ssl_tls: { es: 'SSL/TLS', en: 'SSL/TLS' },
  cache_poisoning: { es: 'Cache Poisoning', en: 'Cache Poisoning' },
  api_security: { es: 'Seguridad API', en: 'API Security' },
  challenge_analysis: { es: 'An\u00e1lisis Challenge', en: 'Challenge Analysis' },
};

const MODULE_ICONS: Record<string, string> = {
  waf_bypass: IC.shield,
  rate_limit: IC.clock,
  bot_evasion: '\uD83E\uDD16',
  custom_rule_bypass: IC.gear,
  ip_geo_access: IC.globe,
  ssl_tls: IC.lock,
  cache_poisoning: '\uD83E\uDDA0',
  api_security: IC.link,
  challenge_analysis: IC.eye,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  info: '#64748b',
};

const OUTCOME_COLORS: Record<string, string> = {
  blocked: '#22c55e',
  challenged: '#f59e0b',
  bypassed: '#ef4444',
  error: '#64748b',
};

const EFFORT_META: Record<string, { es: string; en: string; color: string }> = {
  quick_fix: { es: 'R\u00e1pido', en: 'Quick Fix', color: C.green },
  moderate: { es: 'Moderado', en: 'Moderate', color: C.yellow },
  complex: { es: 'Complejo', en: 'Complex', color: C.orange },
};

// \u2500\u2500\u2500 Translations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const t = {
  es: {
    goBack: 'Volver',
    exportPdf: 'PDF',
    exportCsv: 'CSV',
    exportJson: 'JSON',
    exporting: 'Exportando...',
    title: 'Reporte de Simulaci\u00f3n de Ataques',
    subtitle: 'An\u00e1lisis de defensas contra ataques simulados',
    generated: 'Generado',
    duration: 'Duraci\u00f3n',
    riskLevel: 'Nivel de Riesgo',
    overallScore: 'Puntuaci\u00f3n General',
    totalTests: 'Tests Totales',
    blocked: 'Bloqueados',
    challenged: 'Challenged',
    bypassed: 'Bypassed',
    errors: 'Errores',
    defenseAttribution: 'Atribuci\u00f3n por Capa de Defensa',
    moduleScores: 'Puntuaci\u00f3n por M\u00f3dulo',
    keyFindings: 'Hallazgos Clave',
    strengths: 'Fortalezas',
    immediateActions: 'Acciones Inmediatas',
    disclaimer: 'Este reporte es informativo. Las pruebas simulan ataques controlados contra las defensas de Cloudflare configuradas en tu dominio. No constituye una auditor\u00eda formal de seguridad.',
    tabExecutive: 'Resumen Ejecutivo',
    tabExecutiveDesc: 'Score, riesgo y acciones',
    tabResults: 'Resultados de Tests',
    tabResultsDesc: 'Detalle de cada prueba',
    tabModules: 'Desglose por M\u00f3dulo',
    tabModulesDesc: 'Puntuaci\u00f3n por categor\u00eda',
    tabRoadmap: 'Hallazgos y Roadmap',
    tabRoadmapDesc: 'Plan de remediaci\u00f3n',
    filterModule: 'Filtrar por m\u00f3dulo',
    filterOutcome: 'Filtrar por resultado',
    searchPlaceholder: 'Buscar test por nombre...',
    allModules: 'Todos los m\u00f3dulos',
    allOutcomes: 'Todos los resultados',
    noResults: 'Sin resultados para los filtros actuales.',
    testId: 'Test ID',
    severity: 'Severidad',
    outcome: 'Resultado',
    request: 'Request',
    response: 'Response',
    correlation: 'Correlaci\u00f3n CF',
    recommendation: 'Recomendaci\u00f3n',
    method: 'M\u00e9todo',
    statusCode: 'Status',
    responseTime: 'Tiempo',
    cfMitigated: 'CF Mitigated',
    cfRay: 'CF-Ray',
    challengeType: 'Challenge',
    securitySource: 'Fuente',
    ruleId: 'Regla',
    ruleDesc: 'Descripci\u00f3n de Regla',
    action: 'Acci\u00f3n',
    botScore: 'Bot Score',
    owaspScore: 'OWASP Score',
    wafAttackScore: 'WAF Attack Score',
    headers: 'Headers',
    bodyPreview: 'Preview del Body',
    cacheStatus: 'Cache Status',
    responseHeaders: 'Response Headers',
    page: 'P\u00e1gina',
    of: 'de',
    prev: 'Anterior',
    next: 'Siguiente',
    intelligenceNotes: 'Notas de Inteligencia (Fase 1)',
    testsInModule: 'Tests en este m\u00f3dulo',
    viewBypassed: 'Ver bypassed',
    findings: 'Hallazgos',
    findingId: 'Hallazgo',
    evidence: 'Evidencia',
    remediation: 'Remediaci\u00f3n',
    steps: 'Pasos',
    product: 'Producto CF',
    dashboardPath: 'Ruta Dashboard',
    docsUrl: 'Documentaci\u00f3n',
    effort: 'Esfuerzo',
    riskIfIgnored: 'Riesgo si se ignora',
    roadmap: 'Roadmap de Remediaci\u00f3n',
    phase: 'Fase',
    timeline: 'Timeline',
    relatedFindings: 'Hallazgos relacionados',
    bypassedTests: 'Tests Bypassed',
    notBlockedDetail: 'Detalle de tests no bloqueados',
    score: 'Puntuaci\u00f3n',
    grade: 'Grado',
    phaseDurations: 'Tiempos por Fase',
    intelligence: 'Inteligencia',
    probing: 'Pruebas Activas',
    correlationPhase: 'Correlaci\u00f3n',
    copied: '\u00a1Copiado!',
    copyRule: 'Copiar Regla WAF',
    openDashboard: 'Abrir en CF Dashboard',
    bulkBannerTitle: 'Tests que bypassearon defensas',
    bulkBannerDesc: 'Genera una regla WAF para bloquear los patrones detectados.',
    generatedRule: 'Regla Generada',
    linkedFinding: 'Hallazgo',
    bypassedSection: 'Ataques que no fueron bloqueados',
    bypassedSectionSub: 'Estos ataques pasaron tus defensas. Revisa la recomendaci\u00f3n de cada uno.',
    howToStop: '\u00bfC\u00f3mo bloquearlo?',
    viewAllBypassed: 'Ver los {n} ataques en detalle',
    severityLabel: 'Severidad',
    moduleLabel: 'M\u00f3dulo',
    clickForDetail: 'Clic en la tarjeta para ver el request/response completo \u2192 tab Resultados',
    actionable: 'Accionables',
    actionableSub: 'Acciones disponibles en tu plan actual',
    upgradeOpps: 'Oportunidades de Upgrade',
    upgradeSub: 'Disponibles con un plan superior',
    targets: 'Objetivos',
    targetsDomain: 'Dominio',
    targetsTests: 'Tests',
    targetsBlocked: 'Bloqueados',
    targetsBypassed: 'Bypassed',
    targetsScore: 'Puntuación',
    apex: 'APEX',
    subdomain: 'Subdominio',
    noFindings: 'Sin hallazgos cr\u00edticos \u2014 la zona est\u00e1 bien configurada.',
    viewDocs: 'Ver Docs',
    targetClickHint: 'Clic para ver detalles',
    targetBypassedTests: 'Tests que bypassearon',
    targetBlockedTests: 'Tests bloqueados',
    targetTopRecommendations: 'Recomendaciones principales',
    targetViewAllTests: 'Ver todos los tests de este dominio',
    targetBreakdown: 'Desglose por resultado',
  },
  en: {
    goBack: 'Go Back',
    exportPdf: 'PDF',
    exportCsv: 'CSV',
    exportJson: 'JSON',
    exporting: 'Exporting...',
    title: 'Attack Simulation Report',
    subtitle: 'Defense analysis against simulated attacks',
    generated: 'Generated',
    duration: 'Duration',
    riskLevel: 'Risk Level',
    overallScore: 'Overall Score',
    totalTests: 'Total Tests',
    blocked: 'Blocked',
    challenged: 'Challenged',
    bypassed: 'Bypassed',
    errors: 'Errors',
    defenseAttribution: 'Defense Layer Attribution',
    moduleScores: 'Module Scores',
    keyFindings: 'Key Findings',
    strengths: 'Strengths',
    immediateActions: 'Immediate Actions',
    disclaimer: 'This report is informational. Tests simulate controlled attacks against your domain\u2019s configured Cloudflare defenses. It does not constitute a formal security audit.',
    tabExecutive: 'Executive Summary',
    tabExecutiveDesc: 'Score, risk & actions',
    tabResults: 'Test Results',
    tabResultsDesc: 'Detail of each test',
    tabModules: 'Module Breakdown',
    tabModulesDesc: 'Score by category',
    tabRoadmap: 'Findings & Roadmap',
    tabRoadmapDesc: 'Remediation plan',
    filterModule: 'Filter by module',
    filterOutcome: 'Filter by outcome',
    searchPlaceholder: 'Search test by name...',
    allModules: 'All modules',
    allOutcomes: 'All outcomes',
    noResults: 'No results for current filters.',
    testId: 'Test ID',
    severity: 'Severity',
    outcome: 'Outcome',
    request: 'Request',
    response: 'Response',
    correlation: 'CF Correlation',
    recommendation: 'Recommendation',
    method: 'Method',
    statusCode: 'Status',
    responseTime: 'Time',
    cfMitigated: 'CF Mitigated',
    cfRay: 'CF-Ray',
    challengeType: 'Challenge',
    securitySource: 'Source',
    ruleId: 'Rule',
    ruleDesc: 'Rule Description',
    action: 'Action',
    botScore: 'Bot Score',
    owaspScore: 'OWASP Score',
    wafAttackScore: 'WAF Attack Score',
    headers: 'Headers',
    bodyPreview: 'Body Preview',
    cacheStatus: 'Cache Status',
    responseHeaders: 'Response Headers',
    page: 'Page',
    of: 'of',
    prev: 'Previous',
    next: 'Next',
    intelligenceNotes: 'Intelligence Notes (Phase 1)',
    testsInModule: 'Tests in this module',
    viewBypassed: 'View bypassed',
    findings: 'Findings',
    findingId: 'Finding',
    evidence: 'Evidence',
    remediation: 'Remediation',
    steps: 'Steps',
    product: 'CF Product',
    dashboardPath: 'Dashboard Path',
    docsUrl: 'Documentation',
    effort: 'Effort',
    riskIfIgnored: 'Risk if ignored',
    roadmap: 'Remediation Roadmap',
    phase: 'Phase',
    timeline: 'Timeline',
    relatedFindings: 'Related findings',
    bypassedTests: 'Bypassed Tests',
    notBlockedDetail: 'Not-blocked test details',
    score: 'Score',
    grade: 'Grade',
    phaseDurations: 'Phase Timings',
    intelligence: 'Intelligence',
    probing: 'Active Probing',
    correlationPhase: 'Correlation',
    copied: 'Copied!',
    copyRule: 'Copy WAF Rule',
    openDashboard: 'Open in CF Dashboard',
    bulkBannerTitle: 'Tests that bypassed defenses',
    bulkBannerDesc: 'Generate a WAF rule to block detected patterns.',
    generatedRule: 'Generated Rule',
    linkedFinding: 'Finding',
    bypassedSection: 'Attacks that were not blocked',
    bypassedSectionSub: 'These attacks passed your defenses. Review the recommendation for each one.',
    howToStop: 'How to block it?',
    viewAllBypassed: 'View all {n} attacks in detail',
    severityLabel: 'Severity',
    moduleLabel: 'Module',
    clickForDetail: 'Click a card to see the full request/response \u2192 Results tab',
    actionable: 'Actionable',
    actionableSub: 'Actions available on your current plan',
    upgradeOpps: 'Upgrade Opportunities',
    upgradeSub: 'Available with a plan upgrade',
    targets: 'Targets',
    targetsDomain: 'Domain',
    targetsTests: 'Tests',
    targetsBlocked: 'Blocked',
    targetsBypassed: 'Bypassed',
    targetsScore: 'Score',
    apex: 'APEX',
    subdomain: 'Subdomain',
    noFindings: 'No critical findings \u2014 zone is well-configured.',
    viewDocs: 'View Docs',
    targetClickHint: 'Click to see details',
    targetBypassedTests: 'Bypassed tests',
    targetBlockedTests: 'Blocked tests',
    targetTopRecommendations: 'Top recommendations',
    targetViewAllTests: 'View all tests for this domain',
    targetBreakdown: 'Outcome breakdown',
  },
};

// \u2500\u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function gradeColor(score: number): string {
  if (score >= 90) return C.green;
  if (score >= 75) return C.cyan;
  if (score >= 60) return C.yellow;
  if (score >= 40) return C.orange;
  return C.red;
}

function riskBadgeColor(level: string): string {
  switch (level) {
    case 'low': return C.green;
    case 'medium': return C.yellow;
    case 'high': return C.orange;
    case 'critical': return C.red;
    default: return C.textMuted;
  }
}

function gradeBadgeColor(grade: string): string {
  if (!grade) return C.textMuted;
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return C.green;
  if (g === 'B') return C.cyan;
  if (g === 'C') return C.yellow;
  if (g === 'D') return C.orange;
  if (g === 'F') return C.red;
  return C.textMuted;
}

function fmtDate(iso: string): string {
  if (!iso) return 'N/A';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

function fmtMs(ms: number): string {
  if (!ms && ms !== 0) return 'N/A';
  if (ms >= 60000) return (ms / 60000).toFixed(1) + 'min';
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

function biStr(b: any, lang: 'es' | 'en'): string {
  if (!b) return '';
  if (typeof b === 'string') return b;
  return b[lang] || b.en || b.es || '';
}

// \u2500\u2500\u2500 FASE 3: Copy to Clipboard with visual feedback \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function copyToClipboard(text: string, btnEl?: HTMLElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (btnEl) flashCopied(btnEl);
    return true;
  } catch {
    // Fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (btnEl) flashCopied(btnEl);
      return true;
    } catch { return false; }
  }
}

function flashCopied(el: HTMLElement) {
  const orig = el.textContent;
  el.textContent = '\u2713 Copied!';
  el.style.opacity = '0.7';
  setTimeout(() => {
    el.textContent = orig;
    el.style.opacity = '1';
  }, 1500);
}

// \u2500\u2500\u2500 FASE 3: CF Dashboard deep-link builder \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function buildDashboardUrl(zoneId: string, dashboardPath: string): string {
  if (!zoneId || !dashboardPath) return '';
  // Map dashboard_path like "Security > WAF > Managed rules" to CF URL path
  const pathMap: Record<string, string> = {
    'Security > WAF > Managed rules': 'security/waf/managed-rules',
    'Security > WAF > Custom rules': 'security/waf/custom-rules',
    'Security > WAF > Rate limiting rules': 'security/waf/rate-limiting-rules',
    'Security > WAF': 'security/waf',
    'Security > Bots': 'security/bots',
    'Security > Settings': 'security/settings',
    'SSL/TLS > Overview': 'ssl-tls',
    'SSL/TLS > Edge Certificates': 'ssl-tls/edge-certificates',
    'DNS > Records': 'dns/records',
    'Caching > Configuration': 'caching/configuration',
    'Speed > Optimization': 'speed/optimization',
    'Security > API Shield': 'security/api-shield',
  };
  const mapped = pathMap[dashboardPath];
  if (mapped) return `https://dash.cloudflare.com/${zoneId}/${mapped}`;
  // Fallback: convert path to URL-friendly slug
  const slug = dashboardPath.toLowerCase().replace(/\s*>\s*/g, '/').replace(/\s+/g, '-');
  return `https://dash.cloudflare.com/${zoneId}/${slug}`;
}

// \u2500\u2500\u2500 FASE 3: WAF rule expression generator from bypassed tests \u2500\u2500\u2500\u2500\u2500
function generateWAFRule(bypassedTests: any[]): string {
  if (bypassedTests.length === 0) return '';
  const conditions: string[] = [];
  for (const tr of bypassedTests) {
    const url = tr.request?.url || '';
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (path && path !== '/') {
      conditions.push(`(http.request.uri.path contains "${path.split('?')[0]}")`);
    }
  }
  if (conditions.length === 0) return '(http.request.uri.path contains "/")';
  // Deduplicate
  const unique = [...new Set(conditions)];
  if (unique.length === 1) return unique[0];
  return unique.slice(0, 10).join(' or ');
}

// Plan tiers for Actionable vs Upgrade split
const PLAN_TIER_ORDER: Record<string, number> = {
  free: 0, pro: 1, business: 2, enterprise: 3,
};

function planMeetsMin(currentPlan: string, requiredProduct: string): boolean {
  // If the product mentions Enterprise-only features, check plan
  const lcProd = (requiredProduct || '').toLowerCase();
  const lcPlan = (currentPlan || 'free').toLowerCase();
  const current = PLAN_TIER_ORDER[lcPlan] ?? 0;
  if (lcProd.includes('bot management') || lcProd.includes('api shield')) return current >= 3;
  if (lcProd.includes('advanced rate limiting')) return current >= 3;
  if (lcProd.includes('waf managed') || lcProd.includes('owasp')) return current >= 1;
  return true; // Most features are actionable
}

const ITEMS_PER_PAGE = 20;

// \u2500\u2500\u2500 Props \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
interface Props {
  report: any;
  lang: 'es' | 'en';
  onBack: () => void;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MAIN COMPONENT
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

export default function SimulationReportView({ report, lang, onBack }: Props) {
  const s = t[lang];
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'executive' | 'results' | 'modules' | 'roadmap'>('executive');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);
  const [page, setPage] = useState<number>(0);
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (activeTab !== 'results') setPage(0);
  }, [activeTab]);

  // \u2500\u2500\u2500 Derived Data \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const testResults: any[] = report.test_results || [];
  const modules: any[] = report.modules || [];
  const findings: any[] = report.findings || [];
  const roadmap: any[] = report.roadmap || [];
  const defenseAttribution: any[] = report.defense_attribution || [];
  const execSummary = report.executive_summary || {};
  const zoneId = report.zone_id || '';
  const cfPlan = (report.cf_plan || 'free').toLowerCase();
  const phaseDurations = report.phase_durations || {};

  const summaryStats = {
    total: testResults.length,
    blocked: testResults.filter((tr: any) => tr.outcome === 'blocked').length,
    challenged: testResults.filter((tr: any) => tr.outcome === 'challenged').length,
    bypassed: testResults.filter((tr: any) => tr.outcome === 'bypassed').length,
    errors: testResults.filter((tr: any) => tr.outcome === 'error').length,
  };

  const uniqueModules = Array.from(new Set(testResults.map((tr: any) => tr.module))).filter(Boolean);

  const filteredResults = testResults.filter((tr: any) => {
    if (filterModule !== 'all' && tr.module !== filterModule) return false;
    if (filterOutcome !== 'all' && tr.outcome !== filterOutcome) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = biStr(tr.name, lang).toLowerCase();
      const desc = biStr(tr.description, lang).toLowerCase();
      const testId = (tr.test_id || '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q) && !testId.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / ITEMS_PER_PAGE));
  const pagedResults = filteredResults.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  useEffect(() => { setPage(0); }, [filterModule, filterOutcome, searchQuery]);

  // Bypassed tests for bulk banner
  const bypassedResults = testResults.filter((tr: any) => tr.outcome === 'bypassed');

  // FASE 3: Split findings into actionable vs upgrade
  const actionableFindings = findings.filter((f: any) => {
    if (f.severity === 'info') return false;
    return planMeetsMin(cfPlan, f.remediation?.cf_product || '');
  });
  const upgradeFindings = findings.filter((f: any) => {
    if (f.severity === 'info') return false;
    return !planMeetsMin(cfPlan, f.remediation?.cf_product || '');
  });
  const infoFindings = findings.filter((f: any) => f.severity === 'info');

  // \u2500\u2500\u2500 Export Handlers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const [exporting, setExporting] = useState(false);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    const json = JSON.stringify(report, null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), `simulation-${report.zone_name}.json`);
  }

  function handleExportCsv() {
    const headers = ['Test ID', 'Module', 'Name', 'Severity', 'Outcome', 'Status Code', 'Response Time (ms)', 'Defense Layer', 'Description'];
    const rows: string[][] = [];
    for (const tr of testResults) {
      rows.push([
        tr.test_id || '', tr.module || '', biStr(tr.name, lang), tr.severity || '',
        tr.outcome || '', String(tr.response?.status_code || ''), String(tr.response?.response_time_ms || ''),
        tr.defense_layer || '', biStr(tr.description, lang),
      ]);
    }
    const esc = (v: string) => { const val = String(v).replace(/"/g, '""'); return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val; };
    const csv = [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `simulation-${report.zone_name}.csv`);
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const mg = 14; const mxW = pw - mg * 2;
      let y = 15;
      const addPg = () => { pdf.addPage(); y = 15; };
      const chkPg = (needed: number) => { if (y + needed > 275) addPg(); };

      // Title
      pdf.setFontSize(18); pdf.setTextColor(6, 182, 212);
      pdf.text('Anga Security', mg, y); y += 8;
      pdf.setFontSize(14); pdf.setTextColor(50, 50, 50);
      pdf.text(s.title, mg, y); y += 7;
      pdf.setFontSize(9); pdf.setTextColor(100, 100, 100);
      pdf.text(`Zone: ${report.zone_name} | Plan: ${report.cf_plan || 'N/A'} | ${s.generated}: ${fmtDate(report.generated_at)}`, mg, y); y += 5;
      pdf.text(`${s.duration}: ${fmtMs(report.duration_ms || 0)} | ${s.riskLevel}: ${report.risk_level || 'N/A'}`, mg, y); y += 8;
      pdf.setDrawColor(200); pdf.line(mg, y, pw - mg, y); y += 6;

      // Score + Stats
      pdf.setFontSize(12); pdf.setTextColor(50, 50, 50);
      pdf.text(`${s.overallScore}: ${report.overall_score ?? 'N/A'}/100 (${report.grade || 'N/A'})`, mg, y); y += 7;
      pdf.setFontSize(10);
      pdf.text(`${s.totalTests}: ${summaryStats.total} | ${s.blocked}: ${summaryStats.blocked} | ${s.challenged}: ${summaryStats.challenged} | ${s.bypassed}: ${summaryStats.bypassed}`, mg, y); y += 8;

      // Key findings
      if (execSummary.key_findings?.length) {
        chkPg(20); pdf.setFontSize(12); pdf.setTextColor(50, 50, 50);
        pdf.text(s.keyFindings, mg, y); y += 6;
        pdf.setFontSize(9); pdf.setTextColor(80, 80, 80);
        for (const f of execSummary.key_findings.slice(0, 10)) {
          chkPg(8);
          const lines = pdf.splitTextToSize(`- ${biStr(f, lang)}`, mxW);
          pdf.text(lines, mg, y); y += lines.length * 4 + 2;
        }
        y += 4;
      }

      // Immediate actions
      if (execSummary.immediate_actions?.length) {
        chkPg(20); pdf.setFontSize(12); pdf.setTextColor(50, 50, 50);
        pdf.text(s.immediateActions, mg, y); y += 6;
        pdf.setFontSize(9); pdf.setTextColor(80, 80, 80);
        for (const a of execSummary.immediate_actions.slice(0, 10)) {
          chkPg(8);
          const lines = pdf.splitTextToSize(`- ${biStr(a, lang)}`, mxW);
          pdf.text(lines, mg, y); y += lines.length * 4 + 2;
        }
        y += 4;
      }

      // Module scores
      if (modules.length > 0) {
        chkPg(20); pdf.setFontSize(12); pdf.setTextColor(50, 50, 50);
        pdf.text(s.moduleScores, mg, y); y += 6;
        pdf.setFontSize(9);
        for (const m of modules) {
          chkPg(6); pdf.setTextColor(80, 80, 80);
          const mName = biStr(m.name || MODULE_LABELS[m.module] || { es: m.module, en: m.module }, lang);
          pdf.text(`${mName}: ${m.score}/100 (${m.tests_total} tests, ${m.tests_bypassed} bypassed)`, mg, y); y += 5;
        }
        y += 4;
      }

      // Test results table
      chkPg(20); pdf.setFontSize(12); pdf.setTextColor(50, 50, 50);
      pdf.text(`${s.tabResults} (${testResults.length})`, mg, y); y += 6;
      pdf.setFontSize(8);
      pdf.setFillColor(240, 240, 240); pdf.rect(mg, y - 3, mxW, 5, 'F');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Test', mg + 1, y); pdf.text('Module', mg + 55, y);
      pdf.text('Severity', mg + 90, y); pdf.text('Outcome', mg + 115, y);
      pdf.text('Status', mg + 145, y); y += 5;
      for (const tr of testResults.slice(0, 100)) {
        chkPg(6); pdf.setTextColor(80, 80, 80);
        pdf.text(biStr(tr.name, lang).substring(0, 35), mg + 1, y);
        pdf.text((tr.module || '').substring(0, 20), mg + 55, y);
        const sevC = tr.severity === 'critical' ? [239, 68, 68] : tr.severity === 'high' ? [249, 115, 22] : tr.severity === 'medium' ? [245, 158, 11] : [100, 116, 139];
        pdf.setTextColor(sevC[0], sevC[1], sevC[2]); pdf.text(tr.severity || '', mg + 90, y);
        const outC = tr.outcome === 'blocked' ? [34, 197, 94] : tr.outcome === 'bypassed' ? [239, 68, 68] : [245, 158, 11];
        pdf.setTextColor(outC[0], outC[1], outC[2]); pdf.text(tr.outcome || '', mg + 115, y);
        pdf.setTextColor(80, 80, 80); pdf.text(String(tr.response?.status_code || ''), mg + 145, y);
        y += 4.5;
      }
      if (testResults.length > 100) {
        y += 2; pdf.setTextColor(100, 100, 100);
        pdf.text(`... +${testResults.length - 100} more tests (see CSV export)`, mg, y); y += 5;
      }

      // Findings
      if (findings.length > 0) {
        chkPg(20); pdf.setFontSize(12); pdf.setTextColor(50, 50, 50);
        pdf.text(`${s.keyFindings} (${findings.length})`, mg, y); y += 6;
        pdf.setFontSize(9);
        for (const f of findings.slice(0, 20)) {
          chkPg(12); pdf.setTextColor(80, 80, 80);
          const lines = pdf.splitTextToSize(`[${(f.severity || '').toUpperCase()}] ${biStr(f.title, lang)}`, mxW);
          pdf.text(lines, mg, y); y += lines.length * 4 + 1;
          if (f.description) {
            const desc = pdf.splitTextToSize(biStr(f.description, lang), mxW - 4);
            pdf.setTextColor(120, 120, 120); pdf.text(desc, mg + 4, y); y += desc.length * 3.5 + 3;
          }
        }
      }

      // Footer on all pages
      const totalPgs = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPgs; p++) {
        pdf.setPage(p); pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
        pdf.text('Generated by Anga Security | angaflow.com', mg, 287);
        pdf.text(`Page ${p} of ${totalPgs}`, pw - mg - 20, 287);
      }
      pdf.save(`simulation-${report.zone_name}.pdf`);
    } catch (err) { console.error('PDF export failed:', err); }
    finally { setExporting(false); }
  }

  // \u2500\u2500\u2500 Navigation Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function switchToResultsFiltered(moduleFilter: string, outcomeFilter: string) {
    setFilterModule(moduleFilter);
    setFilterOutcome(outcomeFilter);
    setSearchQuery('');
    setPage(0);
    setActiveTab('results');
  }

  function switchToResultsByTestId(testId: string) {
    setFilterModule('all');
    setFilterOutcome('all');
    setSearchQuery(testId);
    setPage(0);
    setActiveTab('results');
  }

  // \u2550\u2550\u2550\u2550\u2550\u2550 RENDER \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  return (
    <div ref={containerRef} className="space-y-6 max-w-5xl mx-auto" style={{ background: C.bg, minHeight: '100vh' }}>
      {/* Tab Bar — color-coded for easy identification */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" role="tablist">
        {([
          { id: 'executive' as const, label: s.tabExecutive, desc: s.tabExecutiveDesc, icon: IC.chart, color: C.cyan },
          { id: 'results' as const, label: s.tabResults, desc: s.tabResultsDesc, icon: IC.test, color: C.green },
          { id: 'modules' as const, label: s.tabModules, desc: s.tabModulesDesc, icon: IC.module, color: C.purple },
          { id: 'roadmap' as const, label: s.tabRoadmap, desc: s.tabRoadmapDesc, icon: IC.roadmap, color: C.orange },
        ]).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-start gap-1 px-4 py-3 rounded-xl text-left transition-all cursor-pointer"
              style={{
                background: isActive ? tab.color + '12' : C.card,
                border: isActive ? `1.5px solid ${tab.color}50` : `1px solid ${C.border}`,
                boxShadow: isActive ? `0 0 12px ${tab.color}15` : 'none',
              }}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: tab.color }} />
              )}
              <div className="flex items-center gap-2 w-full">
                <span className="text-xl sm:text-2xl flex-shrink-0" style={{ filter: isActive ? 'none' : 'grayscale(0.5) opacity(0.6)' }}>
                  {tab.icon}
                </span>
                <span
                  className="text-xs sm:text-sm font-bold truncate"
                  style={{ color: isActive ? tab.color : C.textMuted }}
                >
                  {tab.label}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs leading-tight pl-7 sm:pl-8" style={{ color: isActive ? C.textSecondary : C.textMuted + '90' }}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'executive' && renderExecutive()}
      {activeTab === 'results' && renderResults()}
      {activeTab === 'modules' && renderModules()}
      {activeTab === 'roadmap' && renderRoadmap()}
    </div>
  );

  // \u2550\u2550\u2550 TAB 1: EXECUTIVE SUMMARY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderExecutive() {
    const riskCol = riskBadgeColor(report.risk_level || 'medium');
    const donutSlices: DonutSlice[] = defenseAttribution.map((da: any) => ({
      label: biStr(da.label, lang),
      value: da.count,
      color: da.color,
    }));

    const notBlockedAttr = defenseAttribution.find((da: any) => da.source === 'not_blocked');
    const notBlockedTestIds: string[] = notBlockedAttr?.test_ids || [];
    const notBlockedTests = testResults.filter((tr: any) => notBlockedTestIds.includes(tr.test_id));

    function handleSliceClick(index: number, _slice: DonutSlice) {
      const attr = defenseAttribution[index];
      if (attr?.source === 'not_blocked') {
        setSelectedSlice(selectedSlice === index ? null : index);
      }
    }

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="no-print flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors"
          style={{ color: C.cyan, background: C.cyan + '10' }}
        >
          {IC.back} {s.goBack}
        </button>

        {/* Header Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div
            className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
            style={{
              background: 'linear-gradient(135deg, #ef444415 0%, #06b6d415 50%, #3b82f620 100%)',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: C.textPrimary }}>{s.title}</h1>
              <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>{s.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: C.cyan }}>Anga Security</p>
              <p className="text-xs" style={{ color: C.textMuted }}>{fmtDate(report.generated_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>Zone</p>
              <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{report.zone_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>Plan</p>
              <p className="text-sm font-semibold uppercase" style={{ color: C.cyan }}>{report.cf_plan || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>{s.duration}</p>
              <p className="text-sm" style={{ color: C.textSecondary }}>{fmtMs(report.duration_ms || 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>{s.riskLevel}</p>
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium uppercase"
                style={{ background: riskCol + '15', color: riskCol, border: `1px solid ${riskCol}30` }}
              >
                {report.risk_level || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Target Summary (if targets exist) */}
        {report.targets && report.targets.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <SectionHeader title={s.targets} icon={IC.target} />
              <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                {lang === 'es' 
                  ? `${report.targets.length} dominio(s) probado(s) en paralelo` 
                  : `${report.targets.length} domain(s) tested in parallel`}
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: C.border }}>
              {report.targets.map((target: any, idx: number) => {
                const gradeCol = gradeBadgeColor(target.grade);
                const riskColor = riskBadgeColor(target.risk_level);
                const bypassPct = target.total_tests > 0 ? ((target.bypassed / target.total_tests) * 100).toFixed(0) : '0';
                const isExpanded = expandedTarget === target.domain;
                // Filter test results for this target by matching domain in request URL
                const targetTests = testResults.filter((tr: any) => {
                  try { return new URL(tr.request?.url || '').hostname === target.domain; } catch { return false; }
                });
                const targetBypassed = targetTests.filter((tr: any) => tr.outcome === 'bypassed');
                const targetBlocked = targetTests.filter((tr: any) => tr.outcome === 'blocked');
                // Get unique recommendations from bypassed tests
                const uniqueRecs: any[] = [];
                const seenRecs = new Set<string>();
                for (const tr of targetBypassed) {
                  if (tr.recommendation?.action) {
                    const key = biStr(tr.recommendation.action, lang);
                    if (!seenRecs.has(key)) { seenRecs.add(key); uniqueRecs.push(tr.recommendation); }
                  }
                }

                return (
                  <div key={idx}>
                    {/* Clickable header row */}
                    <div
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                      onClick={() => setExpandedTarget(isExpanded ? null : target.domain)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs transition-transform" style={{ color: C.textMuted, display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
                          <span className="text-sm font-mono font-semibold truncate" style={{ color: C.textPrimary }}>
                            {target.domain}
                          </span>
                          {target.is_apex && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: C.red + '20', color: C.red }}>
                              {s.apex}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: C.textMuted }}>
                          <span>{target.total_tests} {s.targetsTests.toLowerCase()}</span>
                          <span>{IC.dot}</span>
                          <span style={{ color: C.green }}>{target.blocked} {s.targetsBlocked.toLowerCase()}</span>
                          <span>{IC.dot}</span>
                          <span style={{ color: C.red }}>{target.bypassed} {s.targetsBypassed.toLowerCase()} ({bypassPct}%)</span>
                          {!isExpanded && <span style={{ color: C.cyan, marginLeft: '4px' }}>{s.targetClickHint}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: C.textMuted }}>{s.grade}</div>
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-sm"
                            style={{ background: gradeCol + '20', color: gradeCol, border: `1px solid ${gradeCol}30` }}>
                            {target.grade}
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: C.textMuted }}>{s.targetsScore}</div>
                          <span className="text-sm font-bold" style={{ color: C.cyan }}>{target.score}</span>
                        </div>
                        <div className="text-center">
                          <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: C.textMuted }}>Risk</div>
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase"
                            style={{ background: riskColor + '15', color: riskColor, border: `1px solid ${riskColor}30` }}>
                            {target.risk_level}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4" style={{ background: '#0a0a0f40' }}>
                        {/* Outcome breakdown bar */}
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>{s.targetBreakdown}</p>
                          <div className="flex h-5 rounded-full overflow-hidden" style={{ background: C.border }}>
                            {targetBlocked.length > 0 && <div style={{ width: `${(targetBlocked.length / (targetTests.length || 1)) * 100}%`, background: C.green }} title={`${s.blocked}: ${targetBlocked.length}`} />}
                            {targetBypassed.length > 0 && <div style={{ width: `${(targetBypassed.length / (targetTests.length || 1)) * 100}%`, background: C.red }} title={`${s.bypassed}: ${targetBypassed.length}`} />}
                          </div>
                          <div className="flex gap-4 mt-1.5 text-xs" style={{ color: C.textMuted }}>
                            <span><span style={{ color: C.green }}>{IC.dot}</span> {s.blocked}: {targetBlocked.length}</span>
                            <span><span style={{ color: C.red }}>{IC.dot}</span> {s.bypassed}: {targetBypassed.length}</span>
                          </div>
                        </div>

                        {/* Blocked tests list */}
                        {targetBlocked.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: C.green }}>
                              ✓ {lang === 'es' ? 'Ataques Bloqueados' : 'Blocked Attacks'} ({targetBlocked.length})
                            </p>
                            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.green}20` }}>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ background: C.green + '10', borderBottom: `1px solid ${C.green}15` }}>
                                    <th className="px-3 py-2 text-left font-medium" style={{ color: C.green }}>ID</th>
                                    <th className="px-3 py-2 text-left font-medium" style={{ color: C.green }}>{lang === 'es' ? 'Nombre' : 'Name'}</th>
                                    <th className="px-3 py-2 text-left font-medium" style={{ color: C.green }}>{lang === 'es' ? 'Capa de Defensa' : 'Defense Layer'}</th>
                                    <th className="px-3 py-2 text-center font-medium" style={{ color: C.green }}>HTTP</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {targetBlocked.slice(0, 10).map((tr: any) => (
                                    <tr key={tr.test_id} style={{ borderBottom: `1px solid ${C.green}10` }}>
                                      <td className="px-3 py-1.5 font-mono font-bold" style={{ color: C.green, whiteSpace: 'nowrap' }}>{tr.test_id}</td>
                                      <td className="px-3 py-1.5" style={{ color: C.textSecondary }}>
                                        <span className="mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: (SEVERITY_COLORS[tr.severity] || C.textMuted) + '15', color: SEVERITY_COLORS[tr.severity] || C.textMuted }}>{tr.severity}</span>
                                        {biStr(tr.name, lang)}
                                      </td>
                                      <td className="px-3 py-1.5" style={{ color: C.textMuted }}>
                                        {tr.defense_layer || (lang === 'es' ? 'Desconocido' : 'Unknown')}
                                      </td>
                                      <td className="px-3 py-1.5 text-center font-mono" style={{ color: C.green }}>
                                        {tr.response?.status_code || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {targetBlocked.length > 10 && (
                                <p className="px-3 py-2 text-xs" style={{ color: C.textMuted, borderTop: `1px solid ${C.green}10` }}>
                                  +{targetBlocked.length - 10} {lang === 'es' ? 'más bloqueados' : 'more blocked'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bypassed tests list */}
                        {targetBypassed.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: C.red }}>
                              {IC.fire} {lang === 'es' ? 'Ataques que Evadieron Defensa' : 'Attacks that Bypassed Defense'} ({targetBypassed.length})
                            </p>
                            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.red}20` }}>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ background: C.red + '10', borderBottom: `1px solid ${C.red}15` }}>
                                    <th className="px-3 py-2 text-left font-medium" style={{ color: C.red }}>ID</th>
                                    <th className="px-3 py-2 text-left font-medium" style={{ color: C.red }}>{lang === 'es' ? 'Nombre' : 'Name'}</th>
                                    <th className="px-3 py-2 text-left font-medium" style={{ color: C.red }}>{lang === 'es' ? 'Por qué pasó' : 'Why it passed'}</th>
                                    <th className="px-3 py-2 text-center font-medium" style={{ color: C.red }}>HTTP</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {targetBypassed.slice(0, 10).map((tr: any) => {
                                    const why = tr.defense_layer
                                      ? (lang === 'es' ? 'Sin protección en: ' : 'No protection at: ') + tr.defense_layer
                                      : (tr.recommendation ? biStr(tr.recommendation.action, lang) : (lang === 'es' ? 'Sin capa activa' : 'No active layer'));
                                    return (
                                      <tr key={tr.test_id} style={{ borderBottom: `1px solid ${C.red}10` }}>
                                        <td className="px-3 py-1.5 font-mono font-bold" style={{ color: C.red, whiteSpace: 'nowrap' }}>{tr.test_id}</td>
                                        <td className="px-3 py-1.5" style={{ color: C.textSecondary }}>
                                          <span className="mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: (SEVERITY_COLORS[tr.severity] || C.textMuted) + '15', color: SEVERITY_COLORS[tr.severity] || C.textMuted }}>{tr.severity}</span>
                                          {biStr(tr.name, lang)}
                                        </td>
                                        <td className="px-3 py-1.5 max-w-[160px]" style={{ color: C.textMuted }}>
                                          <span className="block truncate" title={why}>{why}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-mono" style={{ color: C.red }}>
                                          {tr.response?.status_code || '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {targetBypassed.length > 10 && (
                                <p className="px-3 py-2 text-xs" style={{ color: C.textMuted, borderTop: `1px solid ${C.red}10` }}>
                                  +{targetBypassed.length - 10} {lang === 'es' ? 'más. Ver tab Resultados para la lista completa.' : 'more. See Results tab for full list.'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Top recommendations for this target */}
                        {uniqueRecs.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: C.cyan }}>{IC.wrench} {s.targetTopRecommendations}</p>
                            <div className="space-y-2">
                              {uniqueRecs.slice(0, 5).map((rec: any, ri: number) => (
                                <div key={ri} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: C.cyan + '15', color: C.cyan }}>{ri + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs" style={{ color: C.textPrimary }}>{biStr(rec.action, lang)}</p>
                                    <RecommendationActions rec={rec} zoneId={zoneId} lang={lang} s={s} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Button to view all tests for this target */}
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                          style={{ background: C.cyan + '15', color: C.cyan, border: `1px solid ${C.cyan}30`, cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setActiveTab('results'); setSearchQuery(target.domain); }}
                        >
                          {IC.search} {s.targetViewAllTests} {IC.arrow}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overall Score */}
        <div className="rounded-xl p-6 flex flex-col items-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <Speedometer
            score={report.overall_score ?? report.score ?? 0}
            grade={report.overall_grade || report.grade || 'N/A'}
            size={220}
            label={s.overallScore}
          />
        </div>

        {/* FASE 2: Phase Durations */}
        {(phaseDurations.intelligence_ms > 0 || phaseDurations.probing_ms > 0 || phaseDurations.correlation_ms > 0) && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <SectionHeader title={s.phaseDurations} icon={IC.clock} />
            <div className="mt-3 space-y-2">
              {[
                { label: `${IC.brain} ${s.intelligence}`, ms: phaseDurations.intelligence_ms, color: C.purple },
                { label: `${IC.zap} ${s.probing}`, ms: phaseDurations.probing_ms, color: C.red },
                { label: `${IC.search} ${s.correlationPhase}`, ms: phaseDurations.correlation_ms, color: C.cyan },
              ].map((p) => {
                const totalMs = (phaseDurations.intelligence_ms || 0) + (phaseDurations.probing_ms || 0) + (phaseDurations.correlation_ms || 0);
                const pct = totalMs > 0 ? ((p.ms || 0) / totalMs) * 100 : 33;
                return (
                  <div key={p.label} className="flex items-center gap-3">
                    <span className="text-xs w-32 flex-shrink-0" style={{ color: C.textSecondary }}>{p.label}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: C.border }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <span className="text-xs font-mono w-14 text-right flex-shrink-0" style={{ color: C.textMuted }}>{fmtMs(p.ms || 0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MetricCard label={s.totalTests} value={String(summaryStats.total)} icon={IC.test} color={C.cyan} />
          <MetricCard label={s.blocked} value={String(summaryStats.blocked)} icon={IC.check} color={C.green} />
          <MetricCard label={s.challenged} value={String(summaryStats.challenged)} icon={IC.warning} color={C.yellow} />
          <div
            className="cursor-pointer transition-all hover:scale-[1.03]"
            onClick={() => switchToResultsFiltered('all', 'bypassed')}
            title={lang === 'es' ? 'Ver ataques bypassed' : 'View bypassed attacks'}
          >
            <MetricCard label={s.bypassed} value={String(summaryStats.bypassed)} icon={IC.fire} color={C.red} />
          </div>
          <MetricCard label={s.errors} value={String(summaryStats.errors)} icon={IC.bug} color={C.textMuted} />
        </div>

        {/* ── Bypassed Attacks Detail Section ────────────────────────── */}
        {bypassedResults.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.red}35`, background: '#0f0505' }}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${C.red}25`, background: '#1a050510' }}>
              <div className="flex items-center gap-2">
                <span style={{ color: C.red, fontSize: 18 }}>{IC.fire}</span>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: C.red }}>
                    {s.bypassedSection} — {bypassedResults.length} {s.bypassed.toLowerCase()}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{s.bypassedSectionSub}</p>
                </div>
              </div>
              <button
                onClick={() => switchToResultsFiltered('all', 'bypassed')}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: C.red + '15', color: C.red, border: `1px solid ${C.red}30` }}
              >
                {s.viewAllBypassed.replace('{n}', String(bypassedResults.length))} {IC.arrow}
              </button>
            </div>

            {/* Top 5 bypassed attacks */}
            <div className="divide-y" style={{ borderColor: C.red + '15' }}>
              {bypassedResults
                .sort((a: any, b: any) => {
                  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                  return (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5);
                })
                .slice(0, 5)
                .map((tr: any) => {
                  const sevCol = SEVERITY_COLORS[tr.severity] || C.textMuted;
                  const modCol = MODULE_COLORS[tr.module] || C.textMuted;
                  const rec = tr.recommendation;
                  return (
                    <div
                      key={tr.test_id}
                      className="px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => switchToResultsFiltered('all', 'bypassed')}
                    >
                      {/* Top row: badges + name */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono" style={{ background: C.red + '15', color: C.red }}>{tr.test_id}</span>
                        {tr.severity && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase" style={{ background: sevCol + '18', color: sevCol, border: `1px solid ${sevCol}30` }}>
                            {tr.severity}
                          </span>
                        )}
                        {tr.module && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: modCol + '15', color: modCol }}>
                            {MODULE_NAMES[tr.module]?.[lang] || tr.module}
                          </span>
                        )}
                        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>{biStr(tr.name, lang) || tr.test_id}</span>
                      </div>

                      {/* Recommendation: how to stop it */}
                      {rec && (
                        <div className="rounded-lg px-3 py-2.5 mt-2" style={{ background: C.red + '08', border: `1px solid ${C.red}18` }}>
                          <p className="text-xs font-bold mb-1" style={{ color: C.red }}>
                            {IC.wrench} {s.howToStop}
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>
                            {biStr(rec?.action || rec, lang)}
                          </p>
                          {/* Product + effort badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {rec.cf_product && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: C.cyan + '15', color: C.cyan, border: `1px solid ${C.cyan}25` }}>
                                {rec.cf_product}
                              </span>
                            )}
                            {rec.effort && EFFORT_META[rec.effort] && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: EFFORT_META[rec.effort].color + '15', color: EFFORT_META[rec.effort].color }}>
                                {EFFORT_META[rec.effort][lang]}
                              </span>
                            )}
                            {rec.docs_url && (
                              <a
                                href={rec.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80"
                                style={{ background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}25` }}
                              >
                                {IC.doc} {s.viewDocs}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Footer CTA if more than 5 */}
            {bypassedResults.length > 5 && (
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${C.red}20`, background: '#1a050508' }}>
                <p className="text-xs" style={{ color: C.textMuted }}>
                  {IC.info} {s.clickForDetail}
                </p>
                <button
                  onClick={() => switchToResultsFiltered('all', 'bypassed')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: C.red + '15', color: C.red, border: `1px solid ${C.red}30` }}
                >
                  +{bypassedResults.length - 5} {lang === 'es' ? 'más' : 'more'} {IC.arrow}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Defense Layer Attribution DonutChart */}
        {donutSlices.length > 0 && (
          <div className="rounded-xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <SectionHeader title={s.defenseAttribution} icon={IC.shield} />
            <div className="flex justify-center mt-4">
              <DonutChart
                slices={donutSlices}
                size={220}
                centerValue={String(summaryStats.total)}
                centerLabel="tests"
                onSliceClick={handleSliceClick}
              />
            </div>

            {selectedSlice !== null && notBlockedTests.length > 0 && (
              <div className="mt-6 rounded-xl p-5" style={{ background: '#1a050508', border: `1px solid ${C.red}25` }}>
                <SectionHeader title={s.notBlockedDetail} subtitle={`${notBlockedTests.length} tests`} icon={IC.fire} badge={s.bypassed} badgeColor={C.red} />
                <div className="space-y-3 mt-4">
                  {notBlockedTests.map((tr: any) => (
                    <div key={tr.test_id} className="rounded-lg p-4" style={{ background: '#1a0505', border: `1px solid ${C.red}20` }}>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium font-mono" style={{ background: C.red + '15', color: C.red }}>{tr.test_id}</span>
                        <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>{biStr(tr.name, lang) || tr.test_id}</span>
                        {tr.severity && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: (SEVERITY_COLORS[tr.severity] || C.textMuted) + '15', color: SEVERITY_COLORS[tr.severity] || C.textMuted }}>{tr.severity}</span>
                        )}
                      </div>
                      {tr.description && <p className="text-xs mb-2" style={{ color: C.textSecondary }}>{biStr(tr.description, lang)}</p>}
                      {tr.recommendation && (
                        <div className="rounded-lg p-3 mt-2" style={{ background: C.red + '08', border: `1px solid ${C.red}15` }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: C.red }}>{s.recommendation}:</p>
                          <p className="text-xs" style={{ color: C.textSecondary }}>{biStr(tr.recommendation?.action || tr.recommendation, lang)}</p>
                          {/* FASE 3: Action buttons */}
                          <RecommendationActions rec={tr.recommendation} zoneId={zoneId} lang={lang} s={s} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Module Scores Grid */}
        {modules.length > 0 && (
          <div className="space-y-4">
            <SectionHeader title={s.moduleScores} icon={IC.module} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod: any) => {
                const mid = mod.module || mod.id;
                const modColor = MODULE_COLORS[mid] || C.cyan;
                const modName = MODULE_NAMES[mid]?.[lang] || mid;
                const gCol = gradeColor(mod.score ?? 0);
                return (
                  <div
                    key={mid}
                    className="rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${modColor}` }}
                    onClick={() => { setActiveTab('modules'); }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: modColor }}>{MODULE_ICONS[mid] || IC.module}</span>
                          <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>{modName}</span>
                        </div>
                        <span className="text-lg font-black font-mono" style={{ color: gCol }}>{mod.grade || 'N/A'}</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: C.border }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${mod.score ?? 0}%`, background: `linear-gradient(90deg, ${gCol}, ${gCol}80)` }} />
                      </div>
                      <div className="flex justify-between text-xs" style={{ color: C.textMuted }}>
                        <span>{s.score}: {mod.score ?? 0}/100</span>
                        <OutcomeMini label={s.bypassed} count={mod.bypassed || 0} color={C.red} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Executive Summary Sections */}
        {execSummary.attack_surface && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <SectionHeader title={lang === 'es' ? 'Superficie de Ataque' : 'Attack Surface'} icon={IC.globe} />
            <p className="text-sm leading-relaxed mt-2" style={{ color: C.textSecondary }}>{biStr(execSummary.attack_surface, lang)}</p>
          </div>
        )}

        {execSummary.key_findings?.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <SectionHeader title={s.keyFindings} icon={IC.bulb} />
            <div className="space-y-2 mt-3">
              {execSummary.key_findings.map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: C.red + '06' }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: C.red }}>{IC.dot}</span>
                  <span style={{ color: C.textSecondary }}>{biStr(f, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {execSummary.strengths?.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <SectionHeader title={s.strengths} icon={IC.star} />
            <div className="space-y-2 mt-3">
              {execSummary.strengths.map((st: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: C.green + '06' }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: C.green }}>{IC.check}</span>
                  <span style={{ color: C.textSecondary }}>{biStr(st, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {execSummary.immediate_actions?.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.red}20` }}>
            <SectionHeader title={s.immediateActions} icon={IC.warning} />
            <div className="space-y-2 mt-3">
              {execSummary.immediate_actions.map((act: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: C.red + '08' }}>
                  <span className="flex-shrink-0 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: C.red + '20', color: C.red }}>{i + 1}</span>
                  <span style={{ color: C.textPrimary }}>{biStr(act, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px dashed ${C.border}` }}>
          <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{s.disclaimer}</p>
        </div>
      </div>
    );
  }

  // \u2550\u2550\u2550 TAB 2: TEST RESULTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderResults() {
    return (
      <div className="space-y-4">
        {/* FASE 3: Bulk Action Banner for bypassed tests */}
        {bypassedResults.length > 0 && (
          <BulkActionBanner
            bypassedTests={bypassedResults}
            zoneId={zoneId}
            lang={lang}
            s={s}
          />
        )}

        {/* Filter Bar */}
        <div className="rounded-xl p-4 flex flex-wrap gap-3 items-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: C.textMuted }}>{s.filterModule}</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#0a0a0f', color: C.textPrimary, border: `1px solid ${C.border}`, outline: 'none' }}
            >
              <option value="all">{s.allModules}</option>
              {uniqueModules.map((mod: string) => (
                <option key={mod} value={mod}>{MODULE_NAMES[mod]?.[lang] || mod}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: C.textMuted }}>{s.filterOutcome}</label>
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: '#0a0a0f', color: C.textPrimary, border: `1px solid ${C.border}`, outline: 'none' }}
            >
              <option value="all">{s.allOutcomes}</option>
              <option value="blocked">{s.blocked}</option>
              <option value="challenged">{s.challenged}</option>
              <option value="bypassed">{s.bypassed}</option>
              <option value="error">{s.errors}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 w-full sm:w-auto sm:min-w-[200px]">
            <label className="text-xs font-medium" style={{ color: C.textMuted }}>{IC.search}</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={s.searchPlaceholder}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: '#0a0a0f', color: C.textPrimary, border: `1px solid ${C.border}`, outline: 'none' }}
            />
          </div>

          <div className="flex items-end pb-0.5">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: C.cyan + '15', color: C.cyan }}>
              {filteredResults.length} / {testResults.length}
            </span>
          </div>
        </div>

        {pagedResults.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-sm" style={{ color: C.textMuted }}>{s.noResults}</p>
          </div>
        )}

        {pagedResults.map((tr: any) => (
          <TestResultCard key={tr.test_id} tr={tr} lang={lang} s={s} zoneId={zoneId} onFindingClick={switchToResultsByTestId} />
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-2 no-print">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: page === 0 ? C.card : C.cyan + '15', color: page === 0 ? C.textMuted : C.cyan, border: `1px solid ${page === 0 ? C.border : C.cyan + '30'}`, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              {IC.back} {s.prev}
            </button>
            <span className="text-xs font-mono" style={{ color: C.textSecondary }}>{s.page} {page + 1} {s.of} {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: page >= totalPages - 1 ? C.card : C.cyan + '15', color: page >= totalPages - 1 ? C.textMuted : C.cyan, border: `1px solid ${page >= totalPages - 1 ? C.border : C.cyan + '30'}`, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
            >
              {s.next} {IC.arrow}
            </button>
          </div>
        )}
      </div>
    );
  }

  // \u2550\u2550\u2550 TAB 3: MODULE BREAKDOWN \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderModules() {
    return (
      <div className="space-y-6">
        {modules.map((mod: any) => {
          const mid = mod.module || mod.id;
          const modColor = MODULE_COLORS[mid] || C.cyan;
          const modName = MODULE_NAMES[mid]?.[lang] || mid;
          const modIcon = MODULE_ICONS[mid] || IC.module;
          const modTestIds: string[] = mod.test_ids || [];
          const modTests = testResults.filter((tr: any) => modTestIds.includes(tr.test_id) || tr.module === mid);
          const blocked = modTests.filter((tr: any) => tr.outcome === 'blocked').length;
          const challenged = modTests.filter((tr: any) => tr.outcome === 'challenged').length;
          const bypassed = modTests.filter((tr: any) => tr.outcome === 'bypassed').length;
          const total = modTests.length || 1;

          return (
            <div key={mid} className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="p-5 flex flex-wrap items-center gap-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                <span className="text-2xl" style={{ color: modColor }}>{modIcon}</span>
                <div className="flex-1 min-w-[120px]">
                  <h3 className="text-base font-bold" style={{ color: C.textPrimary }}>{modName}</h3>
                  <p className="text-xs" style={{ color: C.textMuted }}>{mid}</p>
                </div>
                <Speedometer score={mod.score ?? 0} grade={mod.grade || 'N/A'} size={120} />
              </div>

              {mod.intelligence_notes && (
                <div className="px-5 py-3" style={{ background: '#0a0a0f80', borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: C.textMuted }}>{IC.brain} {s.intelligenceNotes}</p>
                  <div className="text-xs leading-relaxed space-y-1" style={{ color: C.textSecondary }}>
                    {Array.isArray(mod.intelligence_notes)
                      ? mod.intelligence_notes.map((note: any, ni: number) => <p key={ni}>{biStr(note, lang)}</p>)
                      : <p>{biStr(mod.intelligence_notes, lang)}</p>}
                  </div>
                </div>
              )}

              {/* Proportion Bar */}
              <div className="px-5 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                <div className="flex h-4 rounded-full overflow-hidden" style={{ background: C.border }}>
                  {blocked > 0 && <div style={{ width: `${(blocked / total) * 100}%`, background: C.green }} title={`${s.blocked}: ${blocked}`} />}
                  {challenged > 0 && <div style={{ width: `${(challenged / total) * 100}%`, background: C.yellow }} title={`${s.challenged}: ${challenged}`} />}
                  {bypassed > 0 && <div style={{ width: `${(bypassed / total) * 100}%`, background: C.red }} title={`${s.bypassed}: ${bypassed}`} />}
                </div>
                <div className="flex gap-4 mt-2 text-xs" style={{ color: C.textMuted }}>
                  <span><span style={{ color: C.green }}>{IC.dot}</span> {s.blocked}: {blocked}</span>
                  <span><span style={{ color: C.yellow }}>{IC.dot}</span> {s.challenged}: {challenged}</span>
                  <span><span style={{ color: C.red }}>{IC.dot}</span> {s.bypassed}: {bypassed}</span>
                </div>
              </div>

              <div className="px-5 py-4">
                <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>{s.testsInModule} ({modTests.length})</p>
                <div className="flex flex-wrap gap-2">
                  {modTests.map((tr: any) => {
                    const oCol = OUTCOME_COLORS[tr.outcome] || C.textMuted;
                    return (
                      <span
                        key={tr.test_id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors hover:opacity-80"
                        style={{ background: oCol + '12', color: oCol, border: `1px solid ${oCol}25` }}
                        onClick={() => switchToResultsByTestId(tr.test_id)}
                        title={`${tr.test_id}: ${tr.outcome}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: oCol }} />
                        {tr.test_id}
                      </span>
                    );
                  })}
                </div>

                {bypassed > 0 && (
                  <button
                    className="no-print mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: C.red + '15', color: C.red, border: `1px solid ${C.red}30`, cursor: 'pointer' }}
                    onClick={() => switchToResultsFiltered(mid, 'bypassed')}
                  >
                    {IC.fire} {s.bypassed}: {bypassed} {IC.dash} {s.viewBypassed} {IC.arrow}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // \u2550\u2550\u2550 TAB 4: FINDINGS & ROADMAP \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderRoadmap() {
    return (
      <div className="space-y-8">
        {/* FASE 3: Actionable Findings */}
        {actionableFindings.length > 0 && (
          <div className="space-y-4">
            <SectionHeader
              title={`${s.findings} \u2014 ${s.actionable}`}
              subtitle={s.actionableSub}
              icon={IC.target}
              badge={`${actionableFindings.length}`}
              badgeColor={C.red}
            />
            {actionableFindings.map((finding: any) => (
              <FindingCard key={finding.finding_id} finding={finding} lang={lang} s={s} zoneId={zoneId} testResults={testResults} onTestClick={switchToResultsByTestId} />
            ))}
          </div>
        )}

        {/* FASE 3: Upgrade Opportunities */}
        {upgradeFindings.length > 0 && (
          <div className="space-y-4" style={{ opacity: 0.85 }}>
            <SectionHeader
              title={`${s.findings} \u2014 ${s.upgradeOpps}`}
              subtitle={s.upgradeSub}
              icon={IC.up}
              badge={`${upgradeFindings.length}`}
              badgeColor={C.purple}
            />
            {upgradeFindings.map((finding: any) => (
              <FindingCard key={finding.finding_id} finding={finding} lang={lang} s={s} zoneId={zoneId} testResults={testResults} onTestClick={switchToResultsByTestId} isUpgrade />
            ))}
          </div>
        )}

        {/* Info findings (verified secure) */}
        {infoFindings.length > 0 && (
          <div className="space-y-2">
            <SectionHeader
              title={lang === 'es' ? 'Verificados Seguros' : 'Verified Secure'}
              icon={IC.check}
              badge={`${infoFindings.length}`}
              badgeColor={C.green}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {infoFindings.map((f: any) => (
                <div key={f.finding_id} className="rounded-lg p-3 flex items-start gap-2" style={{ background: C.green + '06', border: `1px solid ${C.green}15` }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: C.green }}>{IC.check}</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: C.textPrimary }}>{biStr(f.title, lang)}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{biStr(f.description, lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {findings.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: C.card, border: `1px solid ${C.green}20` }}>
            <p className="text-lg" style={{ color: C.green }}>{IC.check}</p>
            <p className="text-sm mt-2" style={{ color: C.textSecondary }}>{s.noFindings}</p>
          </div>
        )}

        {/* ROADMAP SECTION */}
        {roadmap.length > 0 && (
          <div className="space-y-4">
            <SectionHeader
              title={s.roadmap}
              icon={IC.roadmap}
              badge={`${roadmap.length} ${lang === 'es' ? 'fases' : 'phases'}`}
              badgeColor={C.blue}
            />
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5" style={{ background: `linear-gradient(180deg, ${C.cyan}, ${C.blue}, ${C.purple})` }} />
              <div className="space-y-4">
                {roadmap.map((phase: any, idx: number) => {
                  const phaseFindings: string[] = phase.finding_ids || phase.findings || [];
                  return (
                    <div key={idx} className="relative pl-14">
                      <div
                        className="absolute left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: C.card, color: C.cyan, border: `2px solid ${C.cyan}`, top: '1.25rem' }}
                      >
                        {phase.phase ?? idx + 1}
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                        <div className="p-5">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: C.cyan + '15', color: C.cyan }}>{s.phase} {phase.phase ?? idx + 1}</span>
                            <h4 className="text-sm font-bold" style={{ color: C.textPrimary }}>{biStr(phase.name, lang)}</h4>
                            {phase.timeline && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: C.blue + '12', color: C.blue }}>{IC.clock} {biStr(phase.timeline, lang)}</span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>{biStr(phase.description, lang)}</p>

                          {phaseFindings.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold mb-1.5" style={{ color: C.textMuted }}>{s.relatedFindings}:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {phaseFindings.map((fid: string) => {
                                  const mf = findings.find((f: any) => f.finding_id === fid);
                                  const fSevCol = mf ? (SEVERITY_COLORS[mf.severity] || C.textMuted) : C.textMuted;
                                  return (
                                    <span
                                      key={fid}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors hover:opacity-80"
                                      style={{ background: fSevCol + '12', color: fSevCol, border: `1px solid ${fSevCol}25` }}
                                      onClick={() => {
                                        const el = document.getElementById(`finding-${fid}`);
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }}
                                      title={mf ? biStr(mf.title, lang) : fid}
                                    >
                                      {fid}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SUB-COMPONENTS
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function OutcomeMini({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: color + '10', color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}: <span className="font-bold">{count}</span>
    </span>
  );
}

// \u2500\u2500\u2500 FASE 3: Recommendation Action Buttons (reusable) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function RecommendationActions({ rec, zoneId, lang, s }: { rec: any; zoneId: string; lang: 'es' | 'en'; s: any }) {
  if (!rec) return null;
  const dashUrl = rec.dashboard_path ? buildDashboardUrl(zoneId, rec.dashboard_path) : '';
  const effortMeta = EFFORT_META[rec.effort] || null;

  return (
    <div className="no-print flex flex-wrap items-center gap-2 mt-2">
      {rec.cf_product && (
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: C.cyan + '12', color: C.cyan }}>
          {IC.gear} {rec.cf_product}
        </span>
      )}
      {effortMeta && (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: effortMeta.color + '15', color: effortMeta.color }}>
          {IC.clock} {effortMeta[lang]}
        </span>
      )}
      {dashUrl && (
        <a
          href={dashUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30` }}
        >
          {IC.external} {s.openDashboard}
        </a>
      )}
      {rec.docs_url && (
        <a
          href={rec.docs_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: C.cyan + '10', color: C.cyan }}
        >
          {IC.doc} {s.viewDocs}
        </a>
      )}
    </div>
  );
}

// \u2500\u2500\u2500 FASE 3: Bulk Action Banner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function BulkActionBanner({ bypassedTests, zoneId, lang, s }: { bypassedTests: any[]; zoneId: string; lang: 'es' | 'en'; s: any }) {
  const [showRule, setShowRule] = useState(false);
  const rule = generateWAFRule(bypassedTests);
  const dashUrl = buildDashboardUrl(zoneId, 'Security > WAF > Custom rules');

  return (
    <div className="no-print rounded-xl p-5" style={{ background: '#1a0505', border: `1px solid ${C.red}25` }}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{IC.warning}</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: C.red }}>{s.bulkBannerTitle} ({bypassedTests.length})</h3>
          <p className="text-xs mt-1" style={{ color: C.textSecondary }}>{s.bulkBannerDesc}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={(e) => copyToClipboard(rule, e.currentTarget)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: C.red + '15', color: C.red, border: `1px solid ${C.red}30`, cursor: 'pointer' }}
            >
              {IC.copy} {s.copyRule}
            </button>
            {dashUrl && (
              <a
                href={dashUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30` }}
              >
                {IC.external} {s.openDashboard}
              </a>
            )}
            <button
              onClick={() => setShowRule(!showRule)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, cursor: 'pointer' }}
            >
              {IC.code} {showRule ? 'Hide' : 'Show'} {s.generatedRule}
            </button>
          </div>

          {showRule && (
            <div className="mt-3 rounded-lg p-3 overflow-x-auto" style={{ background: '#0a0a0f', border: `1px solid ${C.border}` }}>
              <code className="text-xs font-mono break-all" style={{ color: C.orange }}>{rule}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// \u2500\u2500\u2500 Finding Card (used in Findings & Roadmap tab) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function FindingCard({ finding, lang, s, zoneId, testResults, onTestClick, isUpgrade }: {
  finding: any; lang: 'es' | 'en'; s: any; zoneId: string; testResults: any[]; onTestClick: (id: string) => void; isUpgrade?: boolean;
}) {
  const sevCol = SEVERITY_COLORS[finding.severity] || C.textMuted;
  const remediation = finding.remediation || {};
  const evidenceTestIds: string[] = finding.evidence_test_ids || finding.evidence?.test_ids || finding.test_ids || [];
  const dashUrl = remediation.dashboard_path ? buildDashboardUrl(zoneId, remediation.dashboard_path) : '';

  return (
    <div id={`finding-${finding.finding_id}`} className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="p-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono" style={{ background: sevCol + '15', color: sevCol, border: `1px solid ${sevCol}30` }}>{finding.finding_id}</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium uppercase" style={{ background: sevCol + '15', color: sevCol }}>{finding.severity}</span>
          {finding.module && (
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: (MODULE_COLORS[finding.module] || C.cyan) + '12', color: MODULE_COLORS[finding.module] || C.cyan }}>
              {MODULE_NAMES[finding.module]?.[lang] || finding.module}
            </span>
          )}
          {isUpgrade && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: C.purple + '15', color: C.purple }}>{IC.up} Upgrade</span>
          )}
          {finding.bypassed_count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: C.red + '15', color: C.red }}>{s.bypassed}: {finding.bypassed_count}</span>
          )}
        </div>
        <h4 className="text-sm font-bold" style={{ color: C.textPrimary }}>{biStr(finding.title, lang)}</h4>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: C.textSecondary }}>{biStr(finding.description, lang)}</p>
      </div>

      {evidenceTestIds.length > 0 && (
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${C.border}`, background: '#0a0a0f60' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>{IC.eye} {s.evidence}</p>
          <div className="flex flex-wrap gap-1.5">
            {evidenceTestIds.map((tid: string) => {
              const mt = testResults.find((tr: any) => tr.test_id === tid);
              const oCol = mt ? (OUTCOME_COLORS[mt.outcome] || C.textMuted) : C.textMuted;
              return (
                <span
                  key={tid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors hover:opacity-80"
                  style={{ background: oCol + '12', color: oCol, border: `1px solid ${oCol}25` }}
                  onClick={() => onTestClick(tid)}
                  title={`Go to test ${tid}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: oCol }} />{tid}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {remediation.summary && (
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: C.textMuted }}>{IC.wrench} {s.remediation}</p>
          <p className="text-xs leading-relaxed" style={{ color: C.textPrimary }}>{biStr(remediation.summary, lang)}</p>

          {remediation.steps?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold" style={{ color: C.textMuted }}>{s.steps}:</p>
              {remediation.steps.map((step: any, i: number) => {
                let stepText = '';
                if (typeof step === 'string') stepText = step;
                else if (step?.action) {
                  const action = biStr(step.action, lang);
                  const detail = biStr(step.detail, lang);
                  const where = step.where || '';
                  stepText = action + (where ? ` (${where})` : '') + (detail ? ` \u2014 ${detail}` : '');
                } else stepText = biStr(step, lang);
                return (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: '#0a0a0f' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: C.cyan + '15', color: C.cyan }}>{step?.order ?? i + 1}</span>
                    <p className="text-xs" style={{ color: C.textSecondary }}>{stepText}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* FASE 3: Action buttons row */}
          <div className="no-print flex flex-wrap gap-2 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            {remediation.cf_product && (
              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: C.cyan + '12', color: C.cyan }}>{IC.gear} {remediation.cf_product}</span>
            )}
            {remediation.effort && EFFORT_META[remediation.effort] && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: EFFORT_META[remediation.effort].color + '15', color: EFFORT_META[remediation.effort].color }}>
                {IC.clock} {EFFORT_META[remediation.effort][lang]}
              </span>
            )}
            {dashUrl && (
              <a href={dashUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30` }}>
                {IC.external} {s.openDashboard}
              </a>
            )}
            {remediation.docs_url && (
              <a href={remediation.docs_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ background: C.cyan + '10', color: C.cyan }}>
                {IC.doc} {s.viewDocs} {IC.external}
              </a>
            )}
          </div>

          {remediation.risk_if_ignored && (
            <div className="rounded-lg p-3 mt-1" style={{ background: C.red + '06', border: `1px solid ${C.red}15` }}>
              <p className="text-xs">
                <span className="font-semibold" style={{ color: C.red }}>{s.riskIfIgnored}:</span>{' '}
                <span style={{ color: C.textSecondary }}>{biStr(remediation.risk_if_ignored, lang)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// \u2500\u2500\u2500 Enriched Test Result Card (FASE 2 + FASE 3) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function TestResultCard({ tr, lang, s, zoneId, onFindingClick }: {
  tr: any; lang: 'es' | 'en'; s: any; zoneId: string; onFindingClick: (id: string) => void;
}) {
  const isBypassed = tr.outcome === 'bypassed';
  const isBlocked = tr.outcome === 'blocked';
  const isChallenged = tr.outcome === 'challenged';
  const [detailsOpen, setDetailsOpen] = useState(isBypassed);
  const [showBody, setShowBody] = useState(false);

  const outcomeCol = OUTCOME_COLORS[tr.outcome] || C.textMuted;
  const sevCol = SEVERITY_COLORS[tr.severity] || C.textMuted;
  const modCol = MODULE_COLORS[tr.module] || C.cyan;

  let cardBg = C.card;
  let cardBorder = `1px solid ${C.border}`;
  if (isBypassed) { cardBg = '#1a0505'; cardBorder = `1px solid ${C.red}20`; }
  else if (isBlocked) { cardBg = '#051a05'; cardBorder = `1px solid ${C.green}20`; }
  else if (isChallenged) { cardBg = '#1a1a05'; cardBorder = `1px solid ${C.yellow}20`; }

  const request = tr.request || {};
  const response = tr.response || {};
  const correlation = tr.correlation || {};
  const rec = tr.recommendation;
  const hasCorrelation = correlation.security_source || correlation.rule_id || correlation.action || correlation.bot_score != null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: cardBorder }}>
      {/* Header row */}
      <div
        className="px-5 py-4 flex flex-wrap items-center gap-2 cursor-pointer"
        onClick={() => { if (!isBypassed) setDetailsOpen(!detailsOpen); }}
        style={!isBypassed ? { cursor: 'pointer' } : { cursor: 'default' }}
      >
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono" style={{ background: outcomeCol + '15', color: outcomeCol, border: `1px solid ${outcomeCol}30` }}>{tr.test_id}</span>
        {tr.module && <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: modCol + '12', color: modCol }}>{MODULE_NAMES[tr.module]?.[lang] || tr.module}</span>}
        {tr.severity && <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase" style={{ background: sevCol + '15', color: sevCol }}>{tr.severity}</span>}
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase" style={{ background: outcomeCol + '20', color: outcomeCol, border: `1px solid ${outcomeCol}40` }}>{tr.outcome}</span>
        {/* FASE 2: linked_finding_id badge */}
        {tr.linked_finding_id && (
          <span
            className="px-2 py-0.5 rounded text-xs font-mono cursor-pointer hover:opacity-80"
            style={{ background: C.purple + '12', color: C.purple, border: `1px solid ${C.purple}25` }}
            onClick={(e) => { e.stopPropagation(); onFindingClick(tr.linked_finding_id); }}
            title={`${s.linkedFinding}: ${tr.linked_finding_id}`}
          >
            {IC.link} {tr.linked_finding_id}
          </span>
        )}
        <div className="flex-1" />
        {!isBypassed && (
          <span className="text-xs transition-transform" style={{ color: C.textMuted, transform: detailsOpen ? 'rotate(180deg)' : 'none' }}>{IC.chevDown}</span>
        )}
      </div>

      {/* Name + description */}
      <div className="px-5 pb-3">
        <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{biStr(tr.name, lang) || tr.test_id}</p>
        {tr.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: C.textSecondary }}>{biStr(tr.description, lang)}</p>}
      </div>

      {/* Recommendation for bypassed (always visible, prominent) */}
      {isBypassed && rec && (
        <div className="mx-5 mb-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.red}30` }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ background: C.red + '18', borderBottom: `1px solid ${C.red}20` }}>
            <span style={{ color: C.red }}>{IC.wrench}</span>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.red }}>
              {s.howToStop || (lang === 'es' ? '\u00bfC\u00f3mo bloquearlo?' : 'How to block it?')}
            </p>
          </div>
          <div className="px-4 py-3" style={{ background: '#1a050580' }}>
            <p className="text-sm leading-relaxed" style={{ color: C.textPrimary }}>{biStr(rec?.action || rec, lang)}</p>
            <RecommendationActions rec={rec} zoneId={zoneId} lang={lang} s={s} />
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {detailsOpen && (
        <div className="px-5 pb-5 space-y-3" style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Request */}
          <div className="rounded-lg p-3 mt-3" style={{ background: '#0a0a0f', border: `1px solid ${C.border}` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>{s.request}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {request.method && <div><span style={{ color: C.textMuted }}>{s.method}: </span><span className="font-mono font-bold" style={{ color: C.cyan }}>{request.method}</span></div>}
              {request.url && <div className="sm:col-span-2"><span style={{ color: C.textMuted }}>URL: </span><span className="font-mono break-all" style={{ color: C.textSecondary }}>{request.url}</span></div>}
              {request.headers && Object.keys(request.headers).length > 0 && (
                <div className="sm:col-span-2">
                  <span style={{ color: C.textMuted }}>{s.headers}: </span>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(request.headers).map(([k, v]) => (
                      <div key={k} className="font-mono text-xs">
                        <span style={{ color: C.blue }}>{k}</span><span style={{ color: C.textMuted }}>: </span><span style={{ color: C.textSecondary }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* FASE 2: request.body */}
              {request.body && (
                <div className="sm:col-span-2">
                  <span style={{ color: C.textMuted }}>Body: </span>
                  <code className="font-mono text-xs break-all" style={{ color: C.orange }}>{request.body.substring(0, 300)}{request.body.length > 300 ? '...' : ''}</code>
                </div>
              )}
            </div>
          </div>

          {/* Response */}
          <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: `1px solid ${C.border}` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>{s.response}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {response.status_code != null && (
                <div><span style={{ color: C.textMuted }}>{s.statusCode}: </span><span className="font-mono font-bold" style={{ color: response.status_code < 300 ? C.green : response.status_code < 400 ? C.cyan : response.status_code < 500 ? C.yellow : C.red }}>{response.status_code}</span></div>
              )}
              {response.response_time_ms != null && (
                <div><span style={{ color: C.textMuted }}>{s.responseTime}: </span><span className="font-mono" style={{ color: C.textSecondary }}>{response.response_time_ms}ms</span></div>
              )}
              {response.cf_mitigated != null && (
                <div><span style={{ color: C.textMuted }}>{s.cfMitigated}: </span><span className="font-mono font-bold" style={{ color: response.cf_mitigated ? C.green : C.red }}>{response.cf_mitigated ? 'true' : 'false'}</span></div>
              )}
              {response.cf_ray && <div><span style={{ color: C.textMuted }}>{s.cfRay}: </span><span className="font-mono" style={{ color: C.textSecondary }}>{response.cf_ray}</span></div>}
              {response.challenge_type && response.challenge_type !== 'none' && (
                <div><span style={{ color: C.textMuted }}>{s.challengeType}: </span><span className="font-mono" style={{ color: C.yellow }}>{response.challenge_type}</span></div>
              )}
              {/* FASE 2: cache status */}
              {response.cf_cache_status && (
                <div><span style={{ color: C.textMuted }}>{s.cacheStatus}: </span><span className="font-mono" style={{ color: C.cyan }}>{response.cf_cache_status}</span></div>
              )}
            </div>
            {/* FASE 2: response headers */}
            {response.headers && Object.keys(response.headers).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer" style={{ color: C.textMuted }}>{s.responseHeaders} ({Object.keys(response.headers).length})</summary>
                <div className="mt-1 space-y-0.5 pl-2">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="font-mono text-xs"><span style={{ color: C.blue }}>{k}</span><span style={{ color: C.textMuted }}>: </span><span style={{ color: C.textSecondary }}>{String(v)}</span></div>
                  ))}
                </div>
              </details>
            )}
            {/* FASE 2: body_preview (collapsible) */}
            {response.body_preview && (
              <div className="mt-2">
                <button onClick={() => setShowBody(!showBody)} className="text-xs cursor-pointer" style={{ color: C.textMuted, background: 'none', border: 'none', padding: 0 }}>
                  {showBody ? IC.chevDown : IC.arrow} {s.bodyPreview}
                </button>
                {showBody && (
                  <pre className="mt-1 p-2 rounded text-xs overflow-x-auto" style={{ background: C.card, color: C.textSecondary, maxHeight: '200px', overflowY: 'auto' }}>
                    {response.body_preview}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Correlation (enriched FASE 2) */}
          {hasCorrelation && (
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: `1px solid ${C.border}` }}>
              <p className="text-xs font-semibold mb-2" style={{ color: C.textMuted }}>{s.correlation}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {correlation.security_source && (
                  <div><span style={{ color: C.textMuted }}>{s.securitySource}: </span><span className="font-mono font-semibold" style={{ color: C.cyan }}>{correlation.security_source}</span></div>
                )}
                {correlation.rule_id && (
                  <div><span style={{ color: C.textMuted }}>{s.ruleId}: </span><span className="font-mono" style={{ color: C.textSecondary }}>{correlation.rule_id}</span></div>
                )}
                {/* FASE 2: rule_description */}
                {correlation.rule_description && (
                  <div className="col-span-2 sm:col-span-3"><span style={{ color: C.textMuted }}>{s.ruleDesc}: </span><span className="text-xs" style={{ color: C.textSecondary }}>{correlation.rule_description}</span></div>
                )}
                {correlation.action && (
                  <div><span style={{ color: C.textMuted }}>{s.action}: </span><span className="font-mono font-bold" style={{ color: correlation.action === 'block' ? C.green : correlation.action === 'challenge' ? C.yellow : C.textSecondary }}>{correlation.action}</span></div>
                )}
                {correlation.bot_score != null && (
                  <div><span style={{ color: C.textMuted }}>{s.botScore}: </span><span className="font-mono font-bold" style={{ color: correlation.bot_score < 30 ? C.red : correlation.bot_score < 70 ? C.yellow : C.green }}>{correlation.bot_score}</span></div>
                )}
                {/* FASE 2: owasp_score */}
                {correlation.owasp_score != null && (
                  <div><span style={{ color: C.textMuted }}>{s.owaspScore}: </span><span className="font-mono font-bold" style={{ color: correlation.owasp_score > 40 ? C.red : correlation.owasp_score > 20 ? C.yellow : C.green }}>{correlation.owasp_score}</span></div>
                )}
                {/* FASE 2: waf_attack_score */}
                {correlation.waf_attack_score != null && (
                  <div><span style={{ color: C.textMuted }}>{s.wafAttackScore}: </span><span className="font-mono font-bold" style={{ color: correlation.waf_attack_score > 60 ? C.red : correlation.waf_attack_score > 30 ? C.yellow : C.green }}>{correlation.waf_attack_score}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Recommendation for non-bypassed (inside collapsed) */}
          {!isBypassed && rec && (
            <div className="rounded-lg p-3" style={{ background: outcomeCol + '06', border: `1px solid ${outcomeCol}15` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: outcomeCol }}>{s.recommendation}</p>
              <p className="text-xs leading-relaxed" style={{ color: C.textSecondary }}>{biStr(rec?.action || rec, lang)}</p>
              <RecommendationActions rec={rec} zoneId={zoneId} lang={lang} s={s} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
