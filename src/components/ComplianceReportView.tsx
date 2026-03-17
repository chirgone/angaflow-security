/**
 * ComplianceReportView.tsx \u2014 Full compliance report viewer.
 * Renders framework tabs, control tables with regulatory references,
 * evidence, remediation steps, manual checklist, cross-framework matrix,
 * and executive summary.
 *
 * No emoji literals \u2014 all icons use Unicode escapes.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ComplianceReport,
  ComplianceFramework,
  FrameworkResult,
  ComplianceSection,
  ControlResult,
  ControlStatus,
  ControlSeverity,
  BiStr,
  CrossFrameworkRecommendation,
  RemediationAction,
  RemediationPreviewResponse,
  RemediationExecutionResponse,
} from '../lib/api';
import {
  COMPLIANCE_FRAMEWORK_INFO,
  updateManualChecklist,
  previewRemediation,
  executeRemediation,
  AUTOFIX_CREDITS_PER_FIX,
} from '../lib/api';
import {
  Speedometer,
  DonutChart,
  SectionHeader,
  formatNumber,
  COLORS,
} from './AuditCharts';

// \u2500\u2500\u2500 Safe Icon Constants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const IC = {
  back: '\u2190',
  check: '\u2713',
  cross: '\u2717',
  circle: '\u25CB',
  warning: '\u26A0\uFE0F',
  shield: '\uD83D\uDEE1\uFE0F',
  lock: '\uD83D\uDD12',
  doc: '\uD83D\uDCC3',
  chart: '\uD83D\uDCCA',
  bulb: '\uD83D\uDCA1',
  arrow: '\u2192',
  gear: '\u2699\uFE0F',
  clock: '\uD83D\uDD52',
  link: '\uD83D\uDD17',
  eye: '\uD83D\uDC41\uFE0F',
  star: '\u2605',
  dash: '\u2014',
  dot: '\u25CF',
  crown: '\uD83D\uDC51',
  wrench: '\uD83D\uDD27',
  sparkles: '\u2728',
  lightning: '\u26A1',
  target: '\uD83C\uDFAF',
};

// \u2500\u2500\u2500 Translations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const t = {
  es: {
    title: 'Reporte de Cumplimiento Regulatorio',
    subtitle: 'Análisis de cumplimiento basado en tu auditoría de seguridad',
    goBack: 'Volver',
    exportPdf: 'PDF',
    exportCsv: 'CSV',
    exportJson: 'JSON',
    exporting: 'Exportando...',
    overallScore: 'Puntuacion de Cumplimiento',
    sourceAudit: 'Auditoria Fuente',
    zone: 'Zona',
    plan: 'Plan',
    generated: 'Generado',
    duration: 'Duracion',
    staleWarning: 'La auditoria fuente tiene mas de 7 dias. Considera ejecutar una nueva auditoria para resultados mas precisos.',
    // Tabs
    executiveSummary: 'Resumen Ejecutivo',
    executiveSummaryDesc: 'Hallazgos clave y acciones',
    frameworks: 'Marcos',
    frameworksDesc: 'Controles por framework',
    crossMatrix: 'Matriz Cruzada',
    crossMatrixDesc: 'Mapeo entre frameworks',
    tokenAudit: 'Permisos del Token',
    tokenAuditDesc: 'Acceso de tu API token',
    autoFixTab: 'Anga AutoFix',
    autoFixTabDesc: 'Corrige problemas automaticamente',
    // Executive summary
    riskLevel: 'Nivel de Riesgo',
    keyFindings: 'Hallazgos Clave',
    strengths: 'Fortalezas',
    immediateActions: 'Acciones Inmediatas',
    remediationHours: 'horas estimadas de remediacion',
    // Controls
    controls: 'controles',
    passed: 'Aprobados',
    failed: 'Reprobados',
    partial: 'Parciales',
    manual: 'Manuales',
    notApplicable: 'N/A',
    insufficientPerms: 'Sin permisos',
    coverage: 'Cobertura automatizada',
    // Control detail
    regulatoryRef: 'Referencia Regulatoria',
    officialText: 'Texto Oficial',
    applicability: 'Aplicabilidad a Cloudflare',
    evidence: 'Evidencia',
    currentValue: 'Valor Actual',
    expectedValue: 'Valor Esperado',
    details: 'Detalles',
    dataSources: 'Fuentes de Datos',
    remediation: 'Remediacion',
    riskIfIgnored: 'Riesgo si se ignora',
    steps: 'Pasos',
    effort: 'Esfuerzo Estimado',
    cfDocs: 'Documentacion Cloudflare',
    crossRefs: 'Referencias Cruzadas',
    // Manual checklist
    manualChecklist: 'Verificacion Manual',
    markVerified: 'Marcar como Verificado',
    markUnverified: 'Desmarcar',
    verifiedBy: 'Verificado por',
    verifiedAt: 'Fecha de verificacion',
    addNotes: 'Agregar notas...',
    saveNotes: 'Guardar',
    // Token audit
    permAvailable: 'Permisos Disponibles',
    permMissing: 'Permisos Faltantes',
    controlsLimited: 'controles limitados por permisos faltantes',
    // Cross-framework
    dataPoint: 'Punto de Datos',
    cfSetting: 'Configuracion CF',
    currentVal: 'Valor Actual',
    fwCovered: 'Marcos Cubiertos',
    // Status labels
    statusPass: 'Cumple',
    statusFail: 'No Cumple',
    statusPartial: 'Parcial',
    statusNA: 'N/A',
    statusManual: 'Manual',
    statusNoPerms: 'Sin Permisos',
    // Severity
    sevCritical: 'Critico',
    sevHigh: 'Alto',
    sevMedium: 'Medio',
    sevLow: 'Bajo',
    sevInfo: 'Info',
    // Effort
    effortMinutes: 'Minutos',
    effortHours: 'Horas',
    effortDays: 'Dias',
    // Misc
    disclaimer: 'Aviso Legal',
    bundle: 'Bundle',
    individual: 'Individual',
    score: 'Puntuacion',
    grade: 'Grado',
    showDetails: 'Ver detalles',
    hideDetails: 'Ocultar',
    riskLow: 'Bajo',
    riskMedium: 'Medio',
    riskHigh: 'Alto',
    riskCritical: 'Critico',
    noFindings: 'Sin hallazgos criticos.',
    // Insufficient permissions banner
    permsBannerTitle: 'Permiso de API faltante',
    permsBannerDesc: 'Este control no pudo ser evaluado porque tu token de API no tiene el permiso requerido.',
    permsBannerRequired: 'Permiso requerido',
    permsBannerHowTo: 'Para agregar este permiso: ve a Cloudflare Dashboard > Profile > API Tokens > edita tu token y agrega el permiso listado.',
    permsBannerLink: 'Editar tokens de API',
    permsBannerRerun: 'Despues de actualizar tu token, ejecuta el analisis de compliance nuevamente.',
    // Enterprise badge
    enterpriseBadge: 'Enterprise',
    enterpriseRequired: 'Esta caracteristica requiere el plan Enterprise de Cloudflare.',
    // AutoFix
    autoFixAvailable: 'Auto-Fix Disponible',
    autoFixBtn: 'Anga AutoFix',
    autoFixCredits: 'creditos',
    autoFixPreview: 'Vista previa de Auto-Fix',
    autoFixLoading: 'Cargando acciones disponibles...',
    autoFixNoActions: 'No hay acciones de auto-fix disponibles para este control.',
    autoFixAction: 'Accion',
    autoFixCurrent: 'Valor actual',
    autoFixTarget: 'Valor objetivo',
    autoFixRisk: 'Nivel de riesgo',
    autoFixReversible: 'Reversible',
    autoFixYes: 'Si',
    autoFixNo: 'No',
    autoFixExecute: 'Ejecutar Auto-Fix',
    autoFixExecuting: 'Ejecutando...',
    autoFixSuccess: 'Auto-Fix completado exitosamente',
    autoFixPartial: 'Algunas acciones fallaron',
    autoFixFailed: 'Auto-Fix fallo',
    autoFixDisclaimer: 'Esta accion modificara tu configuracion de Cloudflare. Asegurate de entender los cambios antes de continuar.',
    autoFixCreditsCharge: 'Se cobraran {credits} creditos por esta operacion.',
    autoFixTimeSaved: 'Ahorra 1-4 horas de trabajo manual',
    autoFixClose: 'Cerrar',
    autoFixCancel: 'Cancelar',
    autoFixFixAll: 'Arreglar Todos',
    autoFixFixOne: 'Arreglar',
    autoFixIssuesFound: 'problemas encontrados',
    autoFixNoIssues: 'No hay problemas que se puedan arreglar automaticamente.',
    autoFixSetting: 'Configuracion',
    autoFixStatus: 'Estado',
    autoFixSelectAll: 'Seleccionar todos',
    autoFixDeselectAll: 'Deseleccionar todos',
    autoFixSelected: 'seleccionados',
    autoFixTotalCost: 'Costo total',
    // Recommendations
    recommendations: 'Recomendaciones Priorizadas',
    recommendationsSubtitle: 'Correcciones ordenadas por impacto y esfuerzo',
    quickWins: 'Victorias Rapidas',
    highPriority: 'Alta Prioridad',
    mediumPriority: 'Prioridad Media',
    lowPriority: 'Baja Prioridad',
    frameworks: 'marcos',
    showMore: 'Mostrar mas',
    showLess: 'Mostrar menos',
    recommendationLabel: 'Recomendacion',
    businessImpact: 'Impacto de Negocio',
    technicalDetails: 'Detalles Tecnicos',
    quickWinBadge: 'Victoria Rapida',
    autoFixBadge: 'Auto-Fix Disponible',
  },
  en: {
    title: 'Regulatory Compliance Report',
    subtitle: 'Compliance analysis based on your security audit',
    goBack: 'Go Back',
    exportPdf: 'PDF',
    exportCsv: 'CSV',
    exportJson: 'JSON',
    exporting: 'Exporting...',
    overallScore: 'Compliance Score',
    sourceAudit: 'Source Audit',
    zone: 'Zone',
    plan: 'Plan',
    generated: 'Generated',
    duration: 'Duration',
    staleWarning: 'The source audit is over 7 days old. Consider running a new audit for more accurate results.',
    executiveSummary: 'Executive Summary',
    executiveSummaryDesc: 'Key findings & actions',
    frameworks: 'Frameworks',
    frameworksDesc: 'Controls by framework',
    crossMatrix: 'Cross-Framework Matrix',
    crossMatrixDesc: 'Mapping across frameworks',
    tokenAudit: 'Token Permissions',
    tokenAuditDesc: 'Your API token access',
    autoFixTab: 'Anga AutoFix',
    autoFixTabDesc: 'Fix issues automatically',
    riskLevel: 'Risk Level',
    keyFindings: 'Key Findings',
    strengths: 'Strengths',
    immediateActions: 'Immediate Actions',
    remediationHours: 'estimated remediation hours',
    controls: 'controls',
    passed: 'Passed',
    failed: 'Failed',
    partial: 'Partial',
    manual: 'Manual',
    notApplicable: 'N/A',
    insufficientPerms: 'No Permissions',
    coverage: 'Automated coverage',
    regulatoryRef: 'Regulatory Reference',
    officialText: 'Official Text',
    applicability: 'Cloudflare Applicability',
    evidence: 'Evidence',
    currentValue: 'Current Value',
    expectedValue: 'Expected Value',
    details: 'Details',
    dataSources: 'Data Sources',
    remediation: 'Remediation',
    riskIfIgnored: 'Risk if ignored',
    steps: 'Steps',
    effort: 'Estimated Effort',
    cfDocs: 'Cloudflare Documentation',
    crossRefs: 'Cross-References',
    manualChecklist: 'Manual Verification',
    markVerified: 'Mark as Verified',
    markUnverified: 'Unmark',
    verifiedBy: 'Verified by',
    verifiedAt: 'Verification date',
    addNotes: 'Add notes...',
    saveNotes: 'Save',
    permAvailable: 'Available Permissions',
    permMissing: 'Missing Permissions',
    controlsLimited: 'controls limited by missing permissions',
    dataPoint: 'Data Point',
    cfSetting: 'CF Setting',
    currentVal: 'Current Value',
    fwCovered: 'Frameworks Covered',
    statusPass: 'Compliant',
    statusFail: 'Non-Compliant',
    statusPartial: 'Partial',
    statusNA: 'N/A',
    statusManual: 'Manual',
    statusNoPerms: 'No Perms',
    sevCritical: 'Critical',
    sevHigh: 'High',
    sevMedium: 'Medium',
    sevLow: 'Low',
    sevInfo: 'Info',
    effortMinutes: 'Minutes',
    effortHours: 'Hours',
    effortDays: 'Days',
    disclaimer: 'Legal Disclaimer',
    bundle: 'Bundle',
    individual: 'Individual',
    score: 'Score',
    grade: 'Grade',
    showDetails: 'Show details',
    hideDetails: 'Hide',
    riskLow: 'Low',
    riskMedium: 'Medium',
    riskHigh: 'High',
    riskCritical: 'Critical',
    noFindings: 'No critical findings.',
    // Insufficient permissions banner
    permsBannerTitle: 'Missing API permission',
    permsBannerDesc: 'This control could not be evaluated because your API token does not have the required permission.',
    permsBannerRequired: 'Required permission',
    permsBannerHowTo: 'To add this permission: go to Cloudflare Dashboard > Profile > API Tokens > edit your token and add the permission listed.',
    permsBannerLink: 'Edit API tokens',
    permsBannerRerun: 'After updating your token, run the compliance analysis again.',
    // Enterprise badge
    enterpriseBadge: 'Enterprise',
    enterpriseRequired: 'This feature requires Cloudflare Enterprise plan.',
    // AutoFix
    autoFixAvailable: 'Auto-Fix Available',
    autoFixBtn: 'Anga AutoFix',
    autoFixCredits: 'credits',
    autoFixPreview: 'Auto-Fix Preview',
    autoFixLoading: 'Loading available actions...',
    autoFixNoActions: 'No auto-fix actions available for this control.',
    autoFixAction: 'Action',
    autoFixCurrent: 'Current value',
    autoFixTarget: 'Target value',
    autoFixRisk: 'Risk level',
    autoFixReversible: 'Reversible',
    autoFixYes: 'Yes',
    autoFixNo: 'No',
    autoFixExecute: 'Execute Auto-Fix',
    autoFixExecuting: 'Executing...',
    autoFixSuccess: 'Auto-Fix completed successfully',
    autoFixPartial: 'Some actions failed',
    autoFixFailed: 'Auto-Fix failed',
    autoFixDisclaimer: 'This action will modify your Cloudflare configuration. Make sure you understand the changes before proceeding.',
    autoFixCreditsCharge: '{credits} credits will be charged for this operation.',
    autoFixTimeSaved: 'Save 1-4 hours of manual work',
    autoFixClose: 'Close',
    autoFixCancel: 'Cancel',
    autoFixFixAll: 'Fix All',
    autoFixFixOne: 'Fix',
    autoFixIssuesFound: 'issues found',
    autoFixNoIssues: 'No issues can be automatically fixed.',
    autoFixSetting: 'Setting',
    autoFixStatus: 'Status',
    autoFixSelectAll: 'Select all',
    autoFixDeselectAll: 'Deselect all',
    autoFixSelected: 'selected',
    autoFixTotalCost: 'Total cost',
    // Recommendations
    recommendations: 'Prioritized Recommendations',
    recommendationsSubtitle: 'Fixes ranked by impact and effort',
    quickWins: 'Quick Wins',
    highPriority: 'High Priority',
    mediumPriority: 'Medium Priority',
    lowPriority: 'Low Priority',
    frameworks: 'frameworks',
    showMore: 'Show more',
    showLess: 'Show less',
    recommendationLabel: 'Recommendation',
    businessImpact: 'Business Impact',
    technicalDetails: 'Technical Details',
    quickWinBadge: 'Quick Win',
    autoFixBadge: 'Auto-Fix Available',
  },
};

// \u2500\u2500\u2500 Helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function gradeColor(score: number): string {
  if (score >= 90) return COLORS.green;
  if (score >= 75) return COLORS.cyan;
  if (score >= 60) return COLORS.yellow;
  if (score >= 40) return COLORS.orange;
  return COLORS.red;
}

function statusColor(st: ControlStatus): string {
  switch (st) {
    case 'pass': return COLORS.green;
    case 'fail': return COLORS.red;
    case 'partial': return COLORS.yellow;
    case 'manual_required': return COLORS.purple;
    case 'not_applicable': return COLORS.textMuted;
    case 'insufficient_permissions': return COLORS.orange;
    default: return COLORS.textMuted;
  }
}

function statusLabel(st: ControlStatus, s: any): string {
  switch (st) {
    case 'pass': return s.statusPass;
    case 'fail': return s.statusFail;
    case 'partial': return s.statusPartial;
    case 'manual_required': return s.statusManual;
    case 'not_applicable': return s.statusNA;
    case 'insufficient_permissions': return s.statusNoPerms;
    default: return st;
  }
}

function statusIcon(st: ControlStatus): string {
  switch (st) {
    case 'pass': return IC.check;
    case 'fail': return IC.cross;
    case 'partial': return IC.circle;
    case 'manual_required': return IC.eye;
    case 'not_applicable': return IC.dash;
    case 'insufficient_permissions': return IC.lock;
    default: return '?';
  }
}

function sevColor(sev: ControlSeverity): string {
  switch (sev) {
    case 'critical': return COLORS.red;
    case 'high': return COLORS.orange;
    case 'medium': return COLORS.yellow;
    case 'low': return COLORS.cyan;
    case 'info': return COLORS.textMuted;
    default: return COLORS.textMuted;
  }
}

function sevLabel(sev: ControlSeverity, s: any): string {
  switch (sev) {
    case 'critical': return s.sevCritical;
    case 'high': return s.sevHigh;
    case 'medium': return s.sevMedium;
    case 'low': return s.sevLow;
    case 'info': return s.sevInfo;
    default: return sev;
  }
}

function effortLabel(effort: string, s: any): string {
  switch (effort) {
    case 'minutes': return s.effortMinutes;
    case 'hours': return s.effortHours;
    case 'days': return s.effortDays;
    default: return effort;
  }
}

function biStr(b: BiStr | string | undefined | null, lang: 'es' | 'en'): string {
  if (!b) return '';
  if (typeof b === 'string') return b;
  return b[lang] || b.en || b.es || '';
}

function riskColor(level: string): string {
  switch (level) {
    case 'low': return COLORS.green;
    case 'medium': return COLORS.yellow;
    case 'high': return COLORS.orange;
    case 'critical': return COLORS.red;
    default: return COLORS.textMuted;
  }
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

// \u2500\u2500\u2500 Props \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
interface ComplianceReportViewProps {
  report: ComplianceReport;
  reportId: string;
  lang: 'es' | 'en';
  onBack: () => void;
  /** API token for AutoFix operations (optional - if not provided, AutoFix buttons won't show) */
  apiToken?: string;
  /** Callback when credits are charged (to update parent state) */
  onCreditsCharged?: (amount: number) => void;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MAIN COMPONENT
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

export default function ComplianceReportView({ report, reportId, lang, onBack, apiToken, onCreditsCharged }: ComplianceReportViewProps) {
  const s = t[lang];
  const [activeTab, setActiveTab] = useState<'executive' | 'frameworks' | 'matrix' | 'token' | 'autofix'>('executive');
  const [activeFramework, setActiveFramework] = useState<ComplianceFramework>(report.frameworks?.[0] || 'pci_dss' as ComplianceFramework);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [checklistLoading, setChecklistLoading] = useState<string | null>(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  
  // AutoFix Tab state
  const [autoFixTabPreview, setAutoFixTabPreview] = useState<RemediationPreviewResponse | null>(null);
  const [autoFixTabLoading, setAutoFixTabLoading] = useState(false);
  const [autoFixTabError, setAutoFixTabError] = useState<string | null>(null);
  const [autoFixUnlocked, setAutoFixUnlocked] = useState(false);
  const [autoFixSelectedItems, setAutoFixSelectedItems] = useState<Set<string>>(new Set());
  const [autoFixExecutingItem, setAutoFixExecutingItem] = useState<string | null>(null);
  const [autoFixCompletedItems, setAutoFixCompletedItems] = useState<Set<string>>(new Set());
  const [autoFixFailedItems, setAutoFixFailedItems] = useState<Map<string, string>>(new Map());
  const [autoFixManualToken, setAutoFixManualToken] = useState<string>('');
  const [highlightedControlId, setHighlightedControlId] = useState<string | null>(null);
  
  // Effective token for AutoFix (prop or manual entry)
  const effectiveAutoFixToken = apiToken || autoFixManualToken;
  
  // Ref for scroll-to-control in AutoFix tab
  const controlRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // AutoFix Modal state (legacy - for individual control buttons)
  const [autoFixModalOpen, setAutoFixModalOpen] = useState(false);
  const [autoFixControl, setAutoFixControl] = useState<ControlResult | null>(null);
  const [autoFixPreview, setAutoFixPreview] = useState<RemediationPreviewResponse | null>(null);
  const [autoFixLoading, setAutoFixLoading] = useState(false);
  const [autoFixExecuting, setAutoFixExecuting] = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<RemediationExecutionResponse | null>(null);
  const [autoFixError, setAutoFixError] = useState<string | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

  const toggleControl = (id: string) => setExpandedControl(expandedControl === id ? null : id);

  const activeFwResult = (report.framework_results || []).find((fr) => fr.framework === activeFramework);

  // Defensive: summary with defaults
  const summary = report.summary || { total_controls: 0, passed: 0, failed: 0, partial: 0, not_applicable: 0, manual_required: 0, insufficient_permissions: 0, coverage_pct: 0 };

  // Count fixable controls (failed/partial with can_be_automated)
  const fixableControls = (report.framework_results || []).flatMap(fr => 
    fr.sections.flatMap(sec => 
      sec.controls.filter(ctrl => 
        (ctrl.status === 'fail' || ctrl.status === 'partial') && 
        ctrl.remediation?.can_be_automated === true
      )
    )
  );
  const fixableControlsCount = fixableControls.length;

  // AutoFix pricing tiers: 500 (1-3), 1000 (4-7), 1500 (8+)
  const getAutoFixPrice = (count: number) => {
    if (count <= 3) return 500;
    if (count <= 7) return 1000;
    return 1500;
  };

  // ─── Manual Checklist Handler ──────────────────────────────────────────────────────────────────────────────────────────
  async function handleChecklistToggle(ctrl: ControlResult, fw: ComplianceFramework) {
    const newVerified = !ctrl.manual_checklist?.verified;
    setChecklistLoading(ctrl.control_id);
    try {
      await updateManualChecklist(reportId, ctrl.control_id, fw, newVerified, ctrl.manual_checklist?.notes);
      // Optimistic update
      if (ctrl.manual_checklist) {
        ctrl.manual_checklist.verified = newVerified;
        ctrl.manual_checklist.verified_at = new Date().toISOString();
      }
    } catch (err) {
      console.error('Failed to update checklist:', err);
    } finally {
      setChecklistLoading(null);
    }
  }

  // ─── AutoFix Handlers ──────────────────────────────────────────────────────────────────────────
  const handleAutoFixClick = useCallback((ctrl: ControlResult) => {
    // Si no hay token, navegar a AutoFix tab y highlight control
    if (!effectiveAutoFixToken) {
      setActiveTab('autofix');
      setHighlightedControlId(ctrl.control_id);
      return;
    }
    
    // Con token: mantener comportamiento de modal (legacy)
    setAutoFixControl(ctrl);
    setAutoFixModalOpen(true);
    setAutoFixLoading(true);
    setAutoFixError(null);
    setAutoFixResult(null);
    setSelectedActions(new Set());
    
    // Cargar preview asíncronamente
    previewRemediation(reportId, report.zone_id, effectiveAutoFixToken)
      .then(preview => {
        setAutoFixPreview(preview);
        const controlActions = preview.actions.filter(a => a.control_id === ctrl.control_id);
        setSelectedActions(new Set(controlActions.map(a => a.action_id)));
      })
      .catch(err => {
        setAutoFixError(err.message || 'Failed to load preview');
      })
      .finally(() => {
        setAutoFixLoading(false);
      });
  }, [effectiveAutoFixToken, report.zone_id, reportId]);

  const handleAutoFixExecute = useCallback(async () => {
    if (!apiToken || !autoFixPreview || selectedActions.size === 0) return;
    
    setAutoFixExecuting(true);
    setAutoFixError(null);
    
    try {
      // Calculate total cost for selected actions
      const selectedActionsList = autoFixPreview.actions.filter(a => selectedActions.has(a.action_id));
      const totalCost = selectedActionsList.reduce((sum, a) => sum + a.credit_cost, 0);
      
      const result = await executeRemediation(
        reportId,
        report.zone_id,
        report.zone_name,
        apiToken,
        Array.from(selectedActions),
        totalCost
      );
      setAutoFixResult(result);
      if (onCreditsCharged && result.credits_charged > 0) {
        onCreditsCharged(result.credits_charged);
      }
    } catch (err: any) {
      setAutoFixError(err.message || 'Failed to execute AutoFix');
    } finally {
      setAutoFixExecuting(false);
    }
  }, [apiToken, report.zone_id, report.zone_name, reportId, autoFixPreview, selectedActions, onCreditsCharged]);

  const closeAutoFixModal = useCallback(() => {
    setAutoFixModalOpen(false);
    setAutoFixControl(null);
    setAutoFixPreview(null);
    setAutoFixResult(null);
    setAutoFixError(null);
    setSelectedActions(new Set());
  }, []);

  const toggleActionSelection = useCallback((actionId: string) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  }, []);

  // ─── Export Handlers ──────────────────────────────────────────────────────────────────────────

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    const json = JSON.stringify(report, null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), `compliance-${report.zone_name}-${reportId.slice(0, 8)}.json`);
  }

  function handleExportCsv() {
    const headers = [
      'Framework', 'Section', 'Control ID', 'Control Ref', 'Title', 'Status',
      'Severity', 'Score', 'Current Value', 'Expected Value', 'Details',
      'Evaluation Method', 'Effort Estimate',
    ];
    const rows: string[][] = [];
    for (const fr of report.framework_results) {
      const fwName = COMPLIANCE_FRAMEWORK_INFO[fr.framework]?.name || fr.framework;
      for (const sec of fr.sections) {
        const secTitle = biStr(sec.title, lang);
        for (const ctrl of sec.controls) {
          rows.push([
            fwName,
            secTitle,
            ctrl.control_id,
            ctrl.control_ref,
            biStr(ctrl.title, lang),
            ctrl.status,
            ctrl.severity,
            String(ctrl.score),
            ctrl.evidence?.current_value || '',
            ctrl.evidence?.expected_value || '',
            ctrl.evidence?.details || '',
            ctrl.evaluation_method,
            ctrl.remediation?.effort_estimate || '',
          ]);
        }
      }
    }
    const esc = (v: string) => {
      const val = String(v).replace(/"/g, '""');
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
    };
    const csv = [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    downloadBlob(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `compliance-${report.zone_name}-${reportId.slice(0, 8)}.csv`);
  }

  async function handleExportPdf() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const mg = 14;
    const mxW = pw - mg * 2;
    let y = 15;
    const addPg = () => { pdf.addPage(); y = 15; };
    const chkPg = (needed: number) => { if (y + needed > 275) addPg(); };

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(6, 182, 212);
    pdf.text('Anga Security', mg, y); y += 8;
    pdf.setFontSize(14);
    pdf.setTextColor(50, 50, 50);
    pdf.text(s.title, mg, y); y += 7;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${s.zone}: ${report.zone_name}  |  ${s.plan}: ${report.cf_plan}  |  ${s.generated}: ${fmtDate(report.generated_at)}`, mg, y); y += 10;

    // Overall Score
    pdf.setFontSize(12);
    pdf.setTextColor(30, 30, 30);
    pdf.text(`${s.overallScore}: ${report.compliance_score}/100 (${report.compliance_grade})`, mg, y); y += 7;

    // Summary
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${s.passed}: ${report.summary.passed}  |  ${s.partial}: ${report.summary.partial}  |  ${s.failed}: ${report.summary.failed}  |  ${s.manual}: ${report.summary.manual_required}  |  ${s.insufficientPerms}: ${report.summary.insufficient_permissions}`, mg, y); y += 10;

    // Executive Summary
    if (report.executive_summary) {
      chkPg(30);
      pdf.setFontSize(11);
      pdf.setTextColor(30, 30, 30);
      pdf.text(s.executiveSummary, mg, y); y += 6;
      if (report.executive_summary.risk_level) {
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`${s.riskLevel}: ${report.executive_summary.risk_level.toUpperCase()}`, mg, y); y += 5;
      }
      if (report.executive_summary.key_findings?.length) {
        pdf.setFontSize(9);
        pdf.setTextColor(30, 30, 30);
        pdf.text(s.keyFindings + ':', mg, y); y += 4;
        pdf.setTextColor(80, 80, 80);
        for (const f of report.executive_summary.key_findings) {
          chkPg(6);
          const ln = pdf.splitTextToSize('\u2022 ' + biStr(f, lang), mxW - 4);
          pdf.text(ln, mg + 2, y); y += ln.length * 4;
        }
        y += 3;
      }
      if (report.executive_summary.immediate_actions?.length) {
        chkPg(10);
        pdf.setTextColor(30, 30, 30);
        pdf.text(s.immediateActions + ':', mg, y); y += 4;
        pdf.setTextColor(80, 80, 80);
        for (const act of report.executive_summary.immediate_actions) {
          chkPg(6);
          const ln = pdf.splitTextToSize('\u2022 ' + biStr(act, lang), mxW - 4);
          pdf.text(ln, mg + 2, y); y += ln.length * 4;
        }
        y += 3;
      }
      y += 5;
    }

    // Framework Results
    for (const fr of report.framework_results) {
      const fwName = fr.framework_info?.name || COMPLIANCE_FRAMEWORK_INFO[fr.framework]?.name || fr.framework;
      chkPg(15);
      pdf.setFontSize(12);
      pdf.setTextColor(59, 130, 246);
      pdf.text(fwName + ' - ' + fr.framework_score + '/100 (' + fr.framework_grade + ')', mg, y); y += 7;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${s.passed}: ${fr.summary.passed} | ${s.failed}: ${fr.summary.failed} | ${s.partial}: ${fr.summary.partial} | ${s.insufficientPerms}: ${fr.summary.insufficient_permissions}`, mg, y); y += 6;
      for (const sec of fr.sections) {
        chkPg(10);
        pdf.setFontSize(10);
        pdf.setTextColor(50, 50, 50);
        pdf.text(biStr(sec.title, lang), mg, y); y += 5;
        for (const ctrl of sec.controls) {
          chkPg(14);
          const stCh = ctrl.status === 'pass' ? 'PASS' : ctrl.status === 'fail' ? 'FAIL' : ctrl.status === 'partial' ? 'PARTIAL' : ctrl.status.toUpperCase();
          pdf.setFontSize(8);
          pdf.setTextColor(30, 30, 30);
          const tl = pdf.splitTextToSize('[' + stCh + '] ' + ctrl.control_ref + ' - ' + biStr(ctrl.title, lang) + ' (' + ctrl.severity + ', ' + ctrl.score + '/100)', mxW);
          pdf.text(tl, mg + 2, y); y += tl.length * 3.5;
          if (ctrl.evidence?.current_value) {
            pdf.setTextColor(100, 100, 100);
            const el = pdf.splitTextToSize(s.currentValue + ': ' + ctrl.evidence.current_value, mxW - 6);
            pdf.text(el, mg + 4, y); y += el.length * 3.2;
          }
          y += 2;
        }
        y += 3;
      }
      y += 5;
    }

    // Disclaimer
    chkPg(20);
    pdf.setFontSize(7);
    pdf.setTextColor(140, 140, 140);
    if (report.disclaimer) {
      const dl = pdf.splitTextToSize(biStr(report.disclaimer, lang), mxW);
      pdf.text(dl, mg, y);
    }

    pdf.save('compliance-' + report.zone_name + '-' + reportId.slice(0, 8) + '.pdf');
  }

  // \u2500\u2500\u2500 Summary Donut Data \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const donutSlices = [
    { label: s.passed, value: summary.passed || 0, color: COLORS.green },
    { label: s.partial, value: summary.partial || 0, color: COLORS.yellow },
    { label: s.failed, value: summary.failed || 0, color: COLORS.red },
    { label: s.manual, value: summary.manual_required || 0, color: COLORS.purple },
    { label: s.notApplicable, value: summary.not_applicable || 0, color: COLORS.textMuted },
    { label: s.insufficientPerms, value: summary.insufficient_permissions || 0, color: COLORS.orange },
  ].filter((sl) => sl.value > 0);

  // \u2550\u2550\u2550\u2550\u2550\u2550 RENDER \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  return (
    <>
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors" style={{ color: COLORS.cyan, background: COLORS.cyan + '10' }}>
          {IC.back} {s.goBack}
        </button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430' }}>
            {IC.doc} {s.exportPdf}
          </button>
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80" style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e30' }}>
            {IC.chart} {s.exportCsv}
          </button>
          <button onClick={handleExportJson} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:opacity-80" style={{ background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f630' }}>
            {IC.gear} {s.exportJson}
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: COLORS.purple + '15', color: COLORS.purple, border: `1px solid ${COLORS.purple}30` }}>
            {IC.shield} {report.is_bundle ? s.bundle : s.individual}
          </span>
        </div>
      </div>

      {/* Staleness Warning */}
      {report.staleness_warning && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: COLORS.yellow + '08', border: `1px solid ${COLORS.yellow}30` }}>
          <span style={{ color: COLORS.yellow }}>{IC.warning}</span>
          <p className="text-sm" style={{ color: COLORS.yellow }}>{s.staleWarning}</p>
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        {/* Gradient banner */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #8b5cf620 0%, #06b6d415 50%, #3b82f620 100%)', borderBottom: `1px solid ${COLORS.border}` }}>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: COLORS.textPrimary }}>{s.title}</h1>
            <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>{s.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: COLORS.purple }}>Anga Security</p>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(report.generated_at)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Score */}
          <div className="lg:col-span-1 p-6 flex flex-col items-center justify-center lg:border-r" style={{ borderColor: COLORS.border }}>
            <Speedometer score={report.compliance_score} grade={report.compliance_grade} size={180} label={s.overallScore} />
          </div>
          {/* Info */}
          <div className="lg:col-span-2 p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>{s.zone}</p>
              <p className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{report.zone_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>{s.plan}</p>
              <p className="text-sm font-semibold capitalize" style={{ color: COLORS.cyan }}>{report.cf_plan}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>{s.sourceAudit}</p>
              <p className="text-sm font-semibold capitalize" style={{ color: COLORS.textPrimary }}>{report.source_audit_tier}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>{s.generated}</p>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>{fmtDate(report.generated_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>{s.duration}</p>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>{((report.duration_ms || 0) / 1000).toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>{s.coverage}</p>
              <p className="text-sm font-semibold" style={{ color: COLORS.cyan }}>{summary.coverage_pct || 0}%</p>
            </div>
            {/* Summary stats row */}
            <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <StatBadge label={s.passed} value={summary.passed || 0} color={COLORS.green} />
              <StatBadge label={s.failed} value={summary.failed || 0} color={COLORS.red} />
              <StatBadge label={s.partial} value={summary.partial || 0} color={COLORS.yellow} />
              <StatBadge label={s.manual} value={summary.manual_required || 0} color={COLORS.purple} />
              {(summary.insufficient_permissions || 0) > 0 && (
                <StatBadge label={s.insufficientPerms} value={summary.insufficient_permissions || 0} color={COLORS.orange} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar — color-coded for easy identification */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3" role="tablist">
        {([
          { id: 'executive' as const, label: s.executiveSummary, desc: s.executiveSummaryDesc, icon: IC.chart, color: COLORS.cyan, num: summary.total_controls || 0 },
          { id: 'frameworks' as const, label: s.frameworks, desc: s.frameworksDesc, icon: IC.shield, color: COLORS.green, num: (report.framework_results || []).length },
          ...(report.cross_framework_matrix?.length ? [{ id: 'matrix' as const, label: s.crossMatrix, desc: s.crossMatrixDesc, icon: IC.link, color: COLORS.purple, num: report.cross_framework_matrix.length }] : []),
          { id: 'token' as const, label: s.tokenAudit, desc: s.tokenAuditDesc, icon: IC.lock, color: COLORS.orange, num: (report.token_audit?.available_permissions?.length || 0) + (report.token_audit?.missing_permissions?.length || 0) },
          ...(fixableControlsCount > 0 ? [{ id: 'autofix' as const, label: s.autoFixTab, desc: s.autoFixTabDesc, icon: IC.lightning, color: '#f59e0b', num: fixableControlsCount }] : []),
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
                background: isActive ? tab.color + '12' : COLORS.card,
                border: isActive ? `1.5px solid ${tab.color}50` : `1px solid ${COLORS.border}`,
                boxShadow: isActive ? `0 0 12px ${tab.color}15` : 'none',
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: tab.color }} />
              )}
              {/* Icon + Title row */}
              <div className="flex items-center gap-2 w-full">
                <span className="text-xl sm:text-2xl flex-shrink-0" style={{ filter: isActive ? 'none' : 'grayscale(0.5) opacity(0.6)' }}>
                  {tab.icon}
                </span>
                <span
                  className="text-xs sm:text-sm font-bold truncate"
                  style={{ color: isActive ? tab.color : COLORS.textMuted }}
                >
                  {tab.label}
                </span>
              </div>
              {/* Description */}
              <span className="text-[10px] sm:text-xs leading-tight pl-7 sm:pl-8" style={{ color: isActive ? COLORS.textSecondary : COLORS.textMuted + '90' }}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'executive' && renderExecutiveSummary()}
      {activeTab === 'frameworks' && renderFrameworks()}
      {activeTab === 'matrix' && renderCrossMatrix()}
      {activeTab === 'token' && renderTokenAudit()}
      {activeTab === 'autofix' && renderAutoFix()}

      {/* Disclaimer (collapsible) */}
      <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px dashed ${COLORS.border}` }}>
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold cursor-pointer hover:bg-[#ffffff04] transition-colors"
          style={{ color: COLORS.textMuted }}
          onClick={() => setDisclaimerOpen(!disclaimerOpen)}
        >
          <span>{s.disclaimer}</span>
          <span className="transition-transform" style={{ transform: disclaimerOpen ? 'rotate(180deg)' : 'none' }}>{'\u25BC'}</span>
        </button>
        {disclaimerOpen && (
          <div className="px-4 pb-4">
            <p className="text-xs leading-relaxed" style={{ color: COLORS.textMuted }}>{biStr(report.disclaimer, lang)}</p>
          </div>
        )}
      </div>
    </div>

    {/* AutoFix Modal */}
    {autoFixModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <div 
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${COLORS.border}`, background: 'linear-gradient(135deg, #06b6d410 0%, #8B5CF610 100%)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{IC.wrench}</span>
              <div>
                <h2 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>{s.autoFixPreview}</h2>
                {autoFixControl && (
                  <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{biStr(autoFixControl.title, lang)}</p>
                )}
              </div>
            </div>
            <button
              onClick={closeAutoFixModal}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#ffffff10]"
              style={{ color: COLORS.textMuted }}
            >
              {IC.cross}
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-4">
            {/* Loading */}
            {autoFixLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <span className="animate-spin text-2xl" style={{ color: COLORS.cyan }}>{IC.gear}</span>
                  <span style={{ color: COLORS.textSecondary }}>{s.autoFixLoading}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {autoFixError && (
              <div className="p-4 rounded-lg" style={{ background: COLORS.red + '10', border: `1px solid ${COLORS.red}30` }}>
                <p className="text-sm" style={{ color: COLORS.red }}>{autoFixError}</p>
              </div>
            )}

            {/* Success Result */}
            {autoFixResult && (
              <div className="space-y-4">
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    background: autoFixResult.status === 'completed' ? COLORS.green + '10' : autoFixResult.status === 'partial' ? COLORS.yellow + '10' : COLORS.red + '10',
                    border: `1px solid ${autoFixResult.status === 'completed' ? COLORS.green : autoFixResult.status === 'partial' ? COLORS.yellow : COLORS.red}30`
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: autoFixResult.status === 'completed' ? COLORS.green : autoFixResult.status === 'partial' ? COLORS.yellow : COLORS.red }}>
                      {autoFixResult.status === 'completed' ? IC.check : autoFixResult.status === 'partial' ? IC.warning : IC.cross}
                    </span>
                    <span className="font-bold" style={{ color: autoFixResult.status === 'completed' ? COLORS.green : autoFixResult.status === 'partial' ? COLORS.yellow : COLORS.red }}>
                      {autoFixResult.status === 'completed' ? s.autoFixSuccess : autoFixResult.status === 'partial' ? s.autoFixPartial : s.autoFixFailed}
                    </span>
                  </div>
                  <div className="text-xs space-y-1" style={{ color: COLORS.textSecondary }}>
                    <p>{IC.check} {autoFixResult.actions_succeeded} succeeded</p>
                    {autoFixResult.actions_failed > 0 && <p>{IC.cross} {autoFixResult.actions_failed} failed</p>}
                    <p>{IC.lightning} {autoFixResult.credits_charged} credits charged</p>
                    {autoFixResult.credits_refunded > 0 && <p>{IC.arrow} {autoFixResult.credits_refunded} credits refunded</p>}
                  </div>
                </div>

                {/* Results list */}
                <div className="space-y-2">
                  {autoFixResult.results.map((r) => (
                    <div 
                      key={r.action_id}
                      className="p-3 rounded-lg text-xs"
                      style={{ background: r.status === 'success' ? '#0a0d16' : COLORS.red + '08', border: `1px solid ${r.status === 'success' ? COLORS.border : COLORS.red}30` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: r.status === 'success' ? COLORS.green : COLORS.red }}>{r.status === 'success' ? IC.check : IC.cross}</span>
                        <span className="font-mono font-semibold" style={{ color: COLORS.textPrimary }}>{r.control_id}</span>
                      </div>
                      <div className="pl-5 space-y-0.5" style={{ color: COLORS.textMuted }}>
                        <p>{r.message}</p>
                        {r.error && <p style={{ color: COLORS.red }}>{r.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview - Available Actions */}
            {autoFixPreview && !autoFixResult && (
              <>
                {autoFixPreview.actions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p style={{ color: COLORS.textMuted }}>{s.autoFixNoActions}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {autoFixPreview.actions.map((action) => (
                      <div 
                        key={action.action_id}
                        className="p-4 rounded-lg cursor-pointer transition-all"
                        style={{ 
                          background: selectedActions.has(action.action_id) ? COLORS.cyan + '08' : '#0a0d16',
                          border: `1px solid ${selectedActions.has(action.action_id) ? COLORS.cyan : COLORS.border}30`
                        }}
                        onClick={() => toggleActionSelection(action.action_id)}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ 
                              background: selectedActions.has(action.action_id) ? COLORS.cyan : 'transparent',
                              border: `2px solid ${selectedActions.has(action.action_id) ? COLORS.cyan : COLORS.textMuted}`
                            }}
                          >
                            {selectedActions.has(action.action_id) && <span className="text-xs text-white">{IC.check}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold" style={{ color: COLORS.textPrimary }}>{biStr(action.title, lang)}</span>
                              <span 
                                className="px-1.5 py-0.5 rounded text-xs"
                                style={{ 
                                  background: action.risk_level === 'low' ? COLORS.green + '15' : action.risk_level === 'medium' ? COLORS.yellow + '15' : COLORS.red + '15',
                                  color: action.risk_level === 'low' ? COLORS.green : action.risk_level === 'medium' ? COLORS.yellow : COLORS.red
                                }}
                              >
                                {action.risk_level} risk
                              </span>
                              {action.reversible && (
                                <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: COLORS.cyan + '15', color: COLORS.cyan }}>
                                  {s.autoFixReversible}
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>{biStr(action.impact_description, lang)}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: COLORS.textMuted }}>
                              <span>{s.autoFixCurrent}: <span className="font-mono" style={{ color: COLORS.red }}>{action.current_value}</span></span>
                              <span>{IC.arrow}</span>
                              <span>{s.autoFixTarget}: <span className="font-mono" style={{ color: COLORS.green }}>{action.new_value}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="p-3 rounded-lg" style={{ background: COLORS.yellow + '08', border: `1px solid ${COLORS.yellow}20` }}>
                  <p className="text-xs" style={{ color: COLORS.yellow }}>{IC.warning} {s.autoFixDisclaimer}</p>
                </div>

                {/* Credits info */}
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#0a0d16' }}>
                  <span className="text-xs" style={{ color: COLORS.textMuted }}>
                    {s.autoFixCreditsCharge.replace('{credits}', String(autoFixPreview.total_cost))}
                  </span>
                  <span className="text-xs" style={{ color: COLORS.cyan }}>
                    {s.autoFixTimeSaved}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            {autoFixResult ? (
              <button
                onClick={closeAutoFixModal}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: COLORS.cyan + '15', color: COLORS.cyan }}
              >
                {s.autoFixClose}
              </button>
            ) : (
              <>
                <button
                  onClick={closeAutoFixModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ color: COLORS.textMuted }}
                >
                  {s.autoFixCancel}
                </button>
                <button
                  onClick={handleAutoFixExecute}
                  disabled={autoFixExecuting || selectedActions.size === 0}
                  className="px-6 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: autoFixExecuting || selectedActions.size === 0 ? COLORS.textMuted + '30' : 'linear-gradient(135deg, #06b6d4 0%, #8B5CF6 100%)',
                    color: autoFixExecuting || selectedActions.size === 0 ? COLORS.textMuted : '#fff',
                    opacity: autoFixExecuting ? 0.7 : 1,
                  }}
                >
                  {autoFixExecuting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">{IC.gear}</span> {s.autoFixExecuting}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {IC.lightning} {s.autoFixExecute} ({selectedActions.size * AUTOFIX_CREDITS_PER_FIX} {s.autoFixCredits})
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY TAB
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderExecutiveSummary() {
    const exec = report.executive_summary || { risk_level: 'medium' as const, key_findings: [], strengths: [], immediate_actions: [], estimated_remediation_hours: 0 };
    const rLevel = exec.risk_level || 'medium';
    const rCol = riskColor(rLevel);
    const rLabel = (s as any)[`risk${rLevel.charAt(0).toUpperCase() + rLevel.slice(1)}`] || rLevel;

    return (
      <div className="space-y-4">
        {/* Risk Level + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.riskLevel} icon={IC.warning} />
            <div className="flex items-center gap-4 mt-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: rCol + '15', color: rCol, border: `2px solid ${rCol}40` }}>
                {report.compliance_grade}
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-bold" style={{ background: rCol + '15', color: rCol }}>
                  {rLabel}
                </span>
                <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                  {exec.estimated_remediation_hours} {s.remediationHours}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-5 flex items-center justify-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <DonutChart
              slices={donutSlices}
              size={160}
              centerLabel={`${summary.total_controls || 0}`}
              centerValue={s.controls}
            />
          </div>
        </div>

        {/* Framework Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(report.framework_results || []).map((fr) => {
            const fwInfo = COMPLIANCE_FRAMEWORK_INFO[fr.framework];
            const col = gradeColor(fr.framework_score);
            return (
              <div
                key={fr.framework}
                className="rounded-xl cursor-pointer transition-all hover:scale-[1.02] overflow-hidden"
                style={{ background: COLORS.card, border: `1px solid ${col}30` }}
                onClick={() => { setActiveTab('frameworks'); setActiveFramework(fr.framework); }}
              >
                {/* Grade-colored top accent bar */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${col}, ${col}40)` }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: col }}>{fwInfo?.name || fr.framework}</span>
                    <span className="text-xl font-black font-mono" style={{ color: col }}>{fr.framework_grade}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${fr.framework_score}%`, background: `linear-gradient(90deg, ${col}, ${col}80)` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs" style={{ color: COLORS.textMuted }}>
                    <span>{fr.framework_score}/100</span>
                    <span>{fr.summary.passed}/{fr.summary.total_controls} {s.passed.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Findings */}
        <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <SectionHeader title={s.keyFindings} icon={IC.bulb} />
          <div className="space-y-2 mt-3">
            {(exec.key_findings || []).length > 0 ? (exec.key_findings || []).map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: COLORS.red + '06' }}>
                <span className="flex-shrink-0 mt-0.5" style={{ color: COLORS.red }}>{IC.dot}</span>
                <span style={{ color: COLORS.textSecondary }}>{biStr(f, lang)}</span>
              </div>
            )) : (
              <p className="text-sm" style={{ color: COLORS.green }}>{IC.check} {s.noFindings}</p>
            )}
          </div>
        </div>

        {/* Strengths */}
        {(exec.strengths || []).length > 0 && (
          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.strengths} icon={IC.star} />
            <div className="space-y-2 mt-3">
              {(exec.strengths || []).map((st, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: COLORS.green + '06' }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: COLORS.green }}>{IC.check}</span>
                  <span style={{ color: COLORS.textSecondary }}>{biStr(st, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Immediate Actions */}
        {(exec.immediate_actions || []).length > 0 && (
          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.red}20` }}>
            <SectionHeader title={s.immediateActions} icon={IC.warning} />
            <div className="space-y-2 mt-3">
              {(exec.immediate_actions || []).map((act, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: COLORS.red + '08' }}>
                  <span className="flex-shrink-0 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: COLORS.red + '20', color: COLORS.red }}>
                    {i + 1}
                  </span>
                  <span style={{ color: COLORS.textPrimary }}>{biStr(act, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // FRAMEWORKS TAB
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderFrameworks() {
    return (
      <div className="space-y-4">
        {/* Framework sub-tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(report.framework_results || []).map((fr) => {
            const fwInfo = COMPLIANCE_FRAMEWORK_INFO[fr.framework];
            const isActive = activeFramework === fr.framework;
            const col = gradeColor(fr.framework_score);
            return (
              <button
                key={fr.framework}
                onClick={() => setActiveFramework(fr.framework)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  background: isActive ? col + '15' : COLORS.card,
                  color: isActive ? col : COLORS.textMuted,
                  border: `1px solid ${isActive ? col + '40' : COLORS.border}`,
                }}
              >
                <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-black" style={{ background: col + '20', color: col }}>
                  {fr.framework_grade}
                </span>
                {fwInfo?.name || fr.framework}
                <span className="text-xs opacity-60">{fr.framework_score}</span>
              </button>
            );
          })}
        </div>

        {/* Active framework content */}
        {activeFwResult && (
          <div className="space-y-4">
            {/* Framework header */}
            <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>
                    {activeFwResult.framework_info.name}
                  </h3>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    {biStr(activeFwResult.framework_info.full_name, lang)} {IC.dot} {activeFwResult.framework_info.issuing_body}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono" style={{ color: gradeColor(activeFwResult.framework_score) }}>
                      {activeFwResult.framework_score}
                    </span>
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>/100</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black" style={{
                    background: gradeColor(activeFwResult.framework_score) + '15',
                    color: gradeColor(activeFwResult.framework_score),
                  }}>
                    {activeFwResult.framework_grade}
                  </div>
                </div>
              </div>
              {/* Summary row */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <StatBadge label={s.passed} value={activeFwResult.summary.passed} color={COLORS.green} />
                <StatBadge label={s.failed} value={activeFwResult.summary.failed} color={COLORS.red} />
                <StatBadge label={s.partial} value={activeFwResult.summary.partial} color={COLORS.yellow} />
                {activeFwResult.summary.manual_required > 0 && <StatBadge label={s.manual} value={activeFwResult.summary.manual_required} color={COLORS.purple} />}
              </div>
            </div>

            {/* Sections with controls */}
            {activeFwResult.sections.map((section) => (
              <div key={section.id} className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                {/* Section header */}
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{biStr(section.title, lang)}</h4>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>{biStr(section.description, lang)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold" style={{ color: gradeColor(section.section_score) }}>
                      {section.section_score}
                    </span>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{
                      background: gradeColor(section.section_score) + '15',
                      color: gradeColor(section.section_score),
                    }}>
                      {section.section_grade}
                    </span>
                  </div>
                </div>

                {/* Controls table */}
                <div className="divide-y" style={{ borderColor: COLORS.border }}>
                  {section.controls.map((ctrl) => (
                    <ControlRow
                      key={ctrl.control_id}
                      ctrl={ctrl}
                      lang={lang}
                      s={s}
                      expanded={expandedControl === ctrl.control_id}
                      onToggle={() => toggleControl(ctrl.control_id)}
                      onChecklist={() => handleChecklistToggle(ctrl, activeFramework)}
                      checklistLoading={checklistLoading === ctrl.control_id}
                      showAutoFix={true}
                      onAutoFix={() => handleAutoFixClick(ctrl)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // CROSS-FRAMEWORK MATRIX TAB
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderCrossMatrix() {
    const matrix = report.cross_framework_matrix || [];
    const recommendations = report.cross_framework_recommendations || [];
    
    // Group recommendations by priority
    const quickWins = recommendations.filter(r => r.quick_win);
    const highPriority = recommendations.filter(r => !r.quick_win && r.priority_score >= 70);
    const mediumPriority = recommendations.filter(r => !r.quick_win && r.priority_score >= 40 && r.priority_score < 70);
    
    return (
      <div className="space-y-6">
        {/* AI-Powered Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="p-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <SectionHeader 
                title={`${IC.target} ${s.recommendations}`} 
                subtitle={s.recommendationsSubtitle}
                icon={IC.sparkles}
              />
            </div>
            
            <div className="p-4 space-y-5">
              {/* Quick Wins */}
              {quickWins.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.green }}>
                    {IC.lightning} {s.quickWins} ({quickWins.length})
                  </h4>
                  <div className="space-y-3">
                    {quickWins.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} lang={lang} s={s} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* High Priority */}
              {highPriority.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.red }}>
                    {IC.warning} {s.highPriority} ({highPriority.length})
                  </h4>
                  <div className="space-y-3">
                    {highPriority.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} lang={lang} s={s} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Medium Priority */}
              {mediumPriority.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.orange }}>
                    {IC.clock} {s.mediumPriority} ({mediumPriority.length})
                  </h4>
                  <div className="space-y-3">
                    {mediumPriority.slice(0, 3).map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} lang={lang} s={s} />
                    ))}
                    {mediumPriority.length > 3 && (
                      <p className="text-xs text-center py-2" style={{ color: COLORS.textMuted }}>
                        + {mediumPriority.length - 3} more recommendations
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Original Cross-Framework Matrix Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.crossMatrix} subtitle={lang === 'es' ? 'Configuraciones de Cloudflare que satisfacen multiples marcos simultaneamente' : 'Cloudflare settings that satisfy multiple frameworks simultaneously'} icon={IC.link} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#0c0f1a' }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.dataPoint}</th>
                  <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell" style={{ color: COLORS.textMuted }}>{s.currentVal}</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.fwCovered}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((entry, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: COLORS.textPrimary }}>{entry.data_point}</span>
                      <span className="block text-xs font-mono" style={{ color: COLORS.textMuted }}>{entry.cloudflare_setting}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono" style={{ color: COLORS.textSecondary }}>{entry.current_value}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.frameworks_covered.map((fc, j) => {
                          const fwInfo = COMPLIANCE_FRAMEWORK_INFO[fc.framework];
                          const col = statusColor(fc.status);
                          return (
                            <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: col + '12', color: col, border: `1px solid ${col}25` }}>
                              {statusIcon(fc.status)} {fwInfo?.name || fc.framework}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  
  // Recommendation Card Component
  function RecommendationCard({ rec, lang, s }: { rec: CrossFrameworkRecommendation; lang: 'es' | 'en'; s: any }) {
    const [expanded, setExpanded] = useState(false);
    
    const priorityColor = rec.quick_win ? COLORS.green : 
                         rec.priority_score >= 70 ? COLORS.red :
                         rec.priority_score >= 40 ? COLORS.orange : COLORS.textMuted;
    
    const effortLabel = rec.effort_estimate === 'minutes' ? '5-15 min' : 
                       rec.effort_estimate === 'hours' ? '1-4 hrs' : '1-2 days';
    
    return (
      <div 
        className="rounded-lg p-4 cursor-pointer transition-all hover:opacity-95"
        style={{ background: priorityColor + '08', border: `1px solid ${priorityColor}25` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title and badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-bold text-sm" style={{ color: COLORS.textPrimary }}>
                {rec.data_point}
              </span>
              {rec.quick_win && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: COLORS.green + '20', color: COLORS.green }}>
                  {IC.lightning} {s.quickWinBadge}
                </span>
              )}
              {rec.can_autofix && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: COLORS.blue + '20', color: COLORS.blue }}>
                  {IC.wrench} {s.autoFixBadge}
                </span>
              )}
            </div>
            
            {/* AI Insight */}
            <p className="text-xs mb-3 leading-relaxed" style={{ color: COLORS.textSecondary }}>
              {lang === 'es' ? rec.ai_insight.es : rec.ai_insight.en}
            </p>
            
            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs">
              <span style={{ color: COLORS.textMuted }}>
                {IC.chart} {rec.frameworks_impacted} {s.frameworks}
              </span>
              <span style={{ color: COLORS.textMuted }}>
                {IC.clock} {effortLabel}
              </span>
              <span style={{ color: priorityColor }}>
                {IC.target} {rec.priority_score}/100
              </span>
            </div>
          </div>
          
          {/* Expand arrow */}
          <span className="text-xs transition-transform flex-shrink-0" style={{ color: COLORS.textMuted, transform: expanded ? 'rotate(180deg)' : 'none' }}>
            {'\u25BC'}
          </span>
        </div>
        
        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${priorityColor}15` }}>
            {/* Recommendation */}
            <div>
              <h5 className="text-xs font-bold mb-1" style={{ color: COLORS.textPrimary }}>
                {IC.bulb} {s.recommendationLabel}
              </h5>
              <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                {lang === 'es' ? rec.recommendation.es : rec.recommendation.en}
              </p>
            </div>
            
            {/* Business Impact */}
            <div>
              <h5 className="text-xs font-bold mb-1" style={{ color: COLORS.textPrimary }}>
                {IC.chart} {s.businessImpact}
              </h5>
              <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                {lang === 'es' ? rec.business_impact.es : rec.business_impact.en}
              </p>
            </div>
            
            {/* Technical Details */}
            <div>
              <h5 className="text-xs font-bold mb-1" style={{ color: COLORS.textPrimary }}>
                {IC.gear} {s.technicalDetails}
              </h5>
              <p className="text-xs font-mono" style={{ color: COLORS.textMuted }}>
                {rec.technical_details}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
  // TOKEN AUDIT TAB
  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  function renderTokenAudit() {
    const ta = report.token_audit || { permissions_available: [], permissions_missing: [], controls_limited_by_permissions: 0 };
    return (
      <div className="space-y-4">
        {ta.controls_limited_by_permissions > 0 && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: COLORS.orange + '08', border: `1px solid ${COLORS.orange}30` }}>
            <span style={{ color: COLORS.orange }}>{IC.warning}</span>
            <p className="text-sm" style={{ color: COLORS.orange }}>
              <span className="font-bold">{ta.controls_limited_by_permissions}</span> {s.controlsLimited}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Available */}
          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.permAvailable} icon={IC.check} badge={`${ta.permissions_available.length}`} badgeColor={COLORS.green} />
            <div className="space-y-1.5 mt-3">
              {ta.permissions_available.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{ background: COLORS.green + '06' }}>
                  <span style={{ color: COLORS.green }}>{IC.check}</span>
                  <span style={{ color: COLORS.textSecondary }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Missing */}
          <div className="rounded-xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.permMissing} icon={IC.lock} badge={`${ta.permissions_missing.length}`} badgeColor={ta.permissions_missing.length > 0 ? COLORS.orange : COLORS.green} />
            <div className="space-y-1.5 mt-3">
              {ta.permissions_missing.length > 0 ? ta.permissions_missing.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{ background: COLORS.orange + '06' }}>
                  <span style={{ color: COLORS.orange }}>{IC.cross}</span>
                  <span style={{ color: COLORS.textSecondary }}>{p}</span>
                </div>
              )) : (
                <p className="text-xs p-2" style={{ color: COLORS.green }}>{IC.check} {lang === 'es' ? 'Todos los permisos disponibles' : 'All permissions available'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // AUTOFIX TAB
  // ══════════════════════════════════════════════════════════════════════════════

  function renderAutoFix() {
    const price = getAutoFixPrice(fixableControlsCount);
    const selectedCount = autoFixSelectedItems.size;
    
    // Auto-scroll cuando se navega desde framework view
    useEffect(() => {
      if (activeTab === 'autofix' && highlightedControlId) {
        const timer = setTimeout(() => {
          const element = controlRefs.current.get(highlightedControlId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Limpiar highlight después de 2 segundos
            setTimeout(() => setHighlightedControlId(null), 2000);
          }
        }, 300); // Delay para asegurar que DOM esté listo
        
        return () => clearTimeout(timer);
      }
    }, [activeTab, highlightedControlId]);
    
    // If no token is available, show token input form
    if (!effectiveAutoFixToken) {
      return (
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #f59e0b10 0%, #06b6d410 100%)', border: '1px solid #f59e0b30' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{IC.lightning}</span>
              <div>
                <h2 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>Anga AutoFix</h2>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {fixableControlsCount} {s.autoFixIssuesFound}
                </p>
              </div>
            </div>
          </div>
          
          {/* Token Input Card */}
          <div className="rounded-xl p-6" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-start gap-4">
              <span className="text-2xl">{IC.lock}</span>
              <div className="flex-1">
                <h3 className="font-bold mb-2" style={{ color: COLORS.textPrimary }}>
                  {lang === 'es' ? 'Token API Requerido' : 'API Token Required'}
                </h3>
                <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>
                  {lang === 'es' 
                    ? 'Para usar AutoFix, necesitas proporcionar tu token de API de Cloudflare con permisos de escritura para aplicar las correcciones.'
                    : 'To use AutoFix, you need to provide your Cloudflare API token with write permissions to apply the fixes.'}
                </p>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={autoFixManualToken}
                    onChange={(e) => setAutoFixManualToken(e.target.value)}
                    placeholder={lang === 'es' ? 'Ingresa tu API Token de Cloudflare...' : 'Enter your Cloudflare API Token...'}
                    className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                    style={{ 
                      background: '#0a0d16', 
                      border: `1px solid ${autoFixManualToken && autoFixManualToken.length > 0 && autoFixManualToken.length < 20 ? COLORS.red : COLORS.border}`,
                      color: COLORS.textPrimary,
                    }}
                  />
                  {autoFixManualToken && autoFixManualToken.length > 0 && autoFixManualToken.length < 20 && (
                    <p className="text-xs mt-1" style={{ color: COLORS.red }}>
                      {IC.warning} {lang === 'es' ? 'Token parece inválido (muy corto)' : 'Token appears invalid (too short)'}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>
                    {lang === 'es' 
                      ? 'Permisos requeridos: Zone Settings:Edit, DNS:Edit, Firewall Services:Edit (segun los controles a corregir)'
                      : 'Required permissions: Zone Settings:Edit, DNS:Edit, Firewall Services:Edit (depending on controls to fix)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="rounded-xl p-4" style={{ background: COLORS.yellow + '08', border: `1px solid ${COLORS.yellow}20` }}>
            <p className="text-xs" style={{ color: COLORS.yellow }}>{IC.warning} {s.autoFixDisclaimer}</p>
          </div>
        </div>
      );
    }
    
    // Handler to unlock AutoFix (charge credits)
    const handleUnlockAutoFix = async () => {
      if (!effectiveAutoFixToken) return;
      setAutoFixTabLoading(true);
      setAutoFixTabError(null);
      
      try {
        // Call the preview endpoint to get available actions
        const preview = await previewRemediation(reportId, report.zone_id, effectiveAutoFixToken);
        setAutoFixTabPreview(preview);
        
        // For now, mark as unlocked (actual charging happens on fix)
        setAutoFixUnlocked(true);
        // Pre-select all items that have actions
        const controlsWithActions = new Set(preview.actions.map(a => a.control_id));
        setAutoFixSelectedItems(controlsWithActions);
      } catch (err: any) {
        setAutoFixTabError(err.message || 'Failed to load AutoFix preview');
      } finally {
        setAutoFixTabLoading(false);
      }
    };

    // Get action_id for a control from the preview
    const getActionIdForControl = (controlId: string): string | null => {
      if (!autoFixTabPreview) return null;
      const action = autoFixTabPreview.actions.find(a => a.control_id === controlId);
      return action?.action_id || null;
    };

    // Get credit cost for a control
    const getCreditCostForControl = (controlId: string): number => {
      if (!autoFixTabPreview) return 0;
      const action = autoFixTabPreview.actions.find(a => a.control_id === controlId);
      return action?.credit_cost || 0;
    };

    // Handler to fix a single item
    const handleFixOne = async (ctrl: ControlResult) => {
      if (!effectiveAutoFixToken || !autoFixUnlocked || !autoFixTabPreview) return;
      
      const actionId = getActionIdForControl(ctrl.control_id);
      if (!actionId) {
        setAutoFixFailedItems(prev => new Map([...prev, [ctrl.control_id, 'No action available for this control']]));
        return;
      }
      
      setAutoFixExecutingItem(ctrl.control_id);
      
      try {
        const creditCost = getCreditCostForControl(ctrl.control_id);
        const result = await executeRemediation(
          reportId,
          report.zone_id,
          report.zone_name,
          effectiveAutoFixToken,
          [actionId],
          creditCost
        );
        // Check if the action succeeded
        const actionResult = result.results?.[0];
        if (actionResult?.status === 'success') {
          setAutoFixCompletedItems(prev => new Set([...prev, ctrl.control_id]));
          if (onCreditsCharged && result.credits_charged > 0) {
            onCreditsCharged(result.credits_charged);
          }
        } else {
          setAutoFixFailedItems(prev => new Map([...prev, [ctrl.control_id, actionResult?.error || 'Failed']]));
        }
      } catch (err: any) {
        setAutoFixFailedItems(prev => new Map([...prev, [ctrl.control_id, err.message || 'Failed']]));
      } finally {
        setAutoFixExecutingItem(null);
      }
    };

    // Handler to fix all selected items
    const handleFixAll = async () => {
      if (!effectiveAutoFixToken || !autoFixUnlocked || selectedCount === 0 || !autoFixTabPreview) return;
      
      // Get all action_ids for selected controls
      const actionIds: string[] = [];
      let totalCost = 0;
      for (const controlId of autoFixSelectedItems) {
        if (autoFixCompletedItems.has(controlId)) continue;
        const action = autoFixTabPreview.actions.find(a => a.control_id === controlId);
        if (action) {
          actionIds.push(action.action_id);
          totalCost += action.credit_cost;
        }
      }
      
      if (actionIds.length === 0) return;
      
      setAutoFixExecutingItem('all');
      
      try {
        const result = await executeRemediation(
          reportId,
          report.zone_id,
          report.zone_name,
          effectiveAutoFixToken,
          actionIds,
          totalCost
        );
        
        // Mark completed/failed based on results
        for (const res of result.results) {
          if (res.status === 'success') {
            setAutoFixCompletedItems(prev => new Set([...prev, res.control_id]));
          } else {
            setAutoFixFailedItems(prev => new Map([...prev, [res.control_id, res.error || 'Failed']]));
          }
        }
        
        if (onCreditsCharged && result.credits_charged > 0) {
          onCreditsCharged(result.credits_charged);
        }
      } catch (err: any) {
        setAutoFixTabError(err.message || 'Failed to execute AutoFix');
      } finally {
        setAutoFixExecutingItem(null);
      }
    };

    // Toggle selection
    const toggleSelection = (controlId: string) => {
      setAutoFixSelectedItems(prev => {
        const next = new Set(prev);
        if (next.has(controlId)) {
          next.delete(controlId);
        } else {
          next.add(controlId);
        }
        return next;
      });
    };

    // Select/deselect all
    const toggleSelectAll = () => {
      if (selectedCount === fixableControlsCount) {
        setAutoFixSelectedItems(new Set());
      } else {
        setAutoFixSelectedItems(new Set(fixableControls.map(c => c.control_id)));
      }
    };

    return (
      <div className="space-y-4">
        {/* Header Card */}
        <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #f59e0b10 0%, #06b6d410 100%)', border: '1px solid #f59e0b30' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{IC.lightning}</span>
              <div>
                <h2 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>Anga AutoFix</h2>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {fixableControlsCount} {s.autoFixIssuesFound}
                </p>
              </div>
            </div>
            
            {!autoFixUnlocked ? (
              <button
                onClick={handleUnlockAutoFix}
                disabled={autoFixTabLoading || fixableControlsCount === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{
                  background: fixableControlsCount === 0 ? COLORS.textMuted + '30' : 'linear-gradient(135deg, #f59e0b 0%, #06b6d4 100%)',
                  color: fixableControlsCount === 0 ? COLORS.textMuted : '#fff',
                  boxShadow: fixableControlsCount === 0 ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.3)',
                  opacity: autoFixTabLoading ? 0.7 : 1,
                }}
              >
                {autoFixTabLoading ? (
                  <><span className="animate-spin">{IC.gear}</span> {lang === 'es' ? 'Cargando...' : 'Loading...'}</>
                ) : (
                  <>{IC.lightning} {lang === 'es' ? 'Desbloquear AutoFix' : 'Unlock AutoFix'} - {price} {s.autoFixCredits}</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: COLORS.green + '20', color: COLORS.green }}>
                  {IC.check} {lang === 'es' ? 'Desbloqueado' : 'Unlocked'}
                </span>
              </div>
            )}
          </div>
          
          {/* Pricing tiers info */}
          {!autoFixUnlocked && fixableControlsCount > 0 && (
            <div className="mt-4 pt-4 flex flex-wrap gap-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: fixableControlsCount <= 3 ? '#f59e0b20' : '#ffffff08', color: fixableControlsCount <= 3 ? '#f59e0b' : COLORS.textMuted }}>
                1-3 fixes: 500 {s.autoFixCredits}
              </span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: fixableControlsCount >= 4 && fixableControlsCount <= 7 ? '#f59e0b20' : '#ffffff08', color: fixableControlsCount >= 4 && fixableControlsCount <= 7 ? '#f59e0b' : COLORS.textMuted }}>
                4-7 fixes: 1,000 {s.autoFixCredits}
              </span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: fixableControlsCount >= 8 ? '#f59e0b20' : '#ffffff08', color: fixableControlsCount >= 8 ? '#f59e0b' : COLORS.textMuted }}>
                8+ fixes: 1,500 {s.autoFixCredits}
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {autoFixTabError && (
          <div className="rounded-xl p-4" style={{ background: COLORS.red + '10', border: `1px solid ${COLORS.red}30` }}>
            <p className="text-sm" style={{ color: COLORS.red }}>{IC.warning} {autoFixTabError}</p>
          </div>
        )}

        {/* No fixable items */}
        {fixableControlsCount === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <span className="text-4xl">{IC.check}</span>
            <p className="mt-3 text-sm" style={{ color: COLORS.textSecondary }}>{s.autoFixNoIssues}</p>
          </div>
        )}

        {/* Fixable items list */}
        {fixableControlsCount > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            {/* Actions bar */}
            {autoFixUnlocked && (
              <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom: `1px solid ${COLORS.border}`, background: '#ffffff04' }}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: COLORS.cyan + '15', color: COLORS.cyan }}
                  >
                    {selectedCount === fixableControlsCount ? s.autoFixDeselectAll : s.autoFixSelectAll}
                  </button>
                  <span className="text-xs" style={{ color: COLORS.textMuted }}>
                    {selectedCount} {s.autoFixSelected}
                  </span>
                </div>
                <button
                  onClick={handleFixAll}
                  disabled={selectedCount === 0 || autoFixExecutingItem !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: selectedCount === 0 ? COLORS.textMuted + '20' : 'linear-gradient(135deg, #06b6d4 0%, #8B5CF6 100%)',
                    color: selectedCount === 0 ? COLORS.textMuted : '#fff',
                    opacity: autoFixExecutingItem !== null ? 0.7 : 1,
                  }}
                >
                  {IC.lightning} {s.autoFixFixAll} ({selectedCount})
                </button>
              </div>
            )}

            {/* Items */}
            <div className="divide-y" style={{ borderColor: COLORS.border }}>
              {fixableControls.map((ctrl) => {
                const isCompleted = autoFixCompletedItems.has(ctrl.control_id);
                const isFailed = autoFixFailedItems.has(ctrl.control_id);
                const isExecuting = autoFixExecutingItem === ctrl.control_id || autoFixExecutingItem === 'all';
                const isSelected = autoFixSelectedItems.has(ctrl.control_id);
                
                const isHighlighted = highlightedControlId === ctrl.control_id;
                
                return (
                  <div 
                    key={ctrl.control_id}
                    ref={(el) => {
                      if (el) {
                        controlRefs.current.set(ctrl.control_id, el);
                      }
                    }}
                    className="px-4 py-4 flex items-start gap-4"
                    style={{ 
                      background: isCompleted ? COLORS.green + '05' : 
                                  isFailed ? COLORS.red + '05' : 
                                  isHighlighted ? COLORS.cyan + '10' : 
                                  'transparent',
                      border: isHighlighted ? `2px solid ${COLORS.cyan}` : 'none',
                      borderRadius: isHighlighted ? '8px' : '0',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {/* Checkbox (only when unlocked) */}
                    {autoFixUnlocked && !isCompleted && (
                      <button
                        onClick={() => toggleSelection(ctrl.control_id)}
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-1 transition-colors"
                        style={{
                          background: isSelected ? COLORS.cyan : 'transparent',
                          border: `2px solid ${isSelected ? COLORS.cyan : COLORS.textMuted}`,
                        }}
                      >
                        {isSelected && <span className="text-xs text-white">{IC.check}</span>}
                      </button>
                    )}
                    
                    {/* Status icon (when completed/failed) */}
                    {isCompleted && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: COLORS.green + '20', color: COLORS.green }}>
                        {IC.check}
                      </span>
                    )}
                    {isFailed && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: COLORS.red + '20', color: COLORS.red }}>
                        {IC.cross}
                      </span>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold" style={{ color: COLORS.purple }}>{ctrl.control_ref}</span>
                        <span 
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ 
                            background: ctrl.status === 'fail' ? COLORS.red + '15' : COLORS.yellow + '15',
                            color: ctrl.status === 'fail' ? COLORS.red : COLORS.yellow,
                          }}
                        >
                          {ctrl.status === 'fail' ? s.failed : s.partial}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: COLORS.textPrimary }}>{biStr(ctrl.title, lang)}</p>
                      
                      {/* Current vs Expected */}
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg" style={{ background: '#0a0d16' }}>
                          <span style={{ color: COLORS.textMuted }}>{s.autoFixCurrent}: </span>
                          <span className="font-mono" style={{ color: COLORS.red }}>{ctrl.evidence?.current_value || 'N/A'}</span>
                        </div>
                        <div className="p-2 rounded-lg" style={{ background: '#0a0d16' }}>
                          <span style={{ color: COLORS.textMuted }}>{s.autoFixTarget}: </span>
                          <span className="font-mono" style={{ color: COLORS.green }}>{ctrl.evidence?.expected_value || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Error message */}
                      {isFailed && (
                        <p className="mt-2 text-xs" style={{ color: COLORS.red }}>
                          {IC.warning} {autoFixFailedItems.get(ctrl.control_id)}
                        </p>
                      )}
                    </div>

                    {/* Fix button */}
                    {autoFixUnlocked && !isCompleted && (
                      <button
                        onClick={() => handleFixOne(ctrl)}
                        disabled={isExecuting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                        style={{
                          background: isExecuting ? COLORS.textMuted + '20' : COLORS.cyan + '15',
                          color: isExecuting ? COLORS.textMuted : COLORS.cyan,
                        }}
                      >
                        {isExecuting ? (
                          <><span className="animate-spin">{IC.gear}</span> {lang === 'es' ? 'Aplicando...' : 'Applying...'}</>
                        ) : (
                          <>{IC.wrench} {s.autoFixFixOne}</>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {fixableControlsCount > 0 && (
          <div className="rounded-xl p-4" style={{ background: COLORS.yellow + '08', border: `1px solid ${COLORS.yellow}20` }}>
            <p className="text-xs" style={{ color: COLORS.yellow }}>{IC.warning} {s.autoFixDisclaimer}</p>
          </div>
        )}
      </div>
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg" style={{ background: color + '10', color }}>
      <span className="font-bold">{value}</span> {label}
    </span>
  );
}

// \u2500\u2500\u2500 Control Row (expandable) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function ControlRow({
  ctrl,
  lang,
  s,
  expanded,
  onToggle,
  onChecklist,
  checklistLoading,
  onAutoFix,
  showAutoFix,
}: {
  ctrl: ControlResult;
  lang: 'es' | 'en';
  s: any;
  expanded: boolean;
  onToggle: () => void;
  onChecklist: () => void;
  checklistLoading: boolean;
  onAutoFix?: () => void;
  showAutoFix?: boolean;
}) {
  const stCol = statusColor(ctrl.status);
  const svCol = sevColor(ctrl.severity);

  return (
    <div style={{ borderColor: COLORS.border }}>
      {/* Summary row */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-[#ffffff04]"
        onClick={onToggle}
      >
        {/* Status badge + label */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ minWidth: 48 }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: stCol + '15', color: stCol, border: `1px solid ${stCol}30` }}>
            {statusIcon(ctrl.status)}
          </span>
          <span className="text-xs font-semibold leading-none" style={{ color: stCol, fontSize: '0.6rem' }}>
            {statusLabel(ctrl.status, s)}
          </span>
        </div>
        {/* Title + ref */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold" style={{ color: COLORS.purple }}>{ctrl.control_ref}</span>
            <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ background: svCol + '12', color: svCol }}>
              {sevLabel(ctrl.severity, s)}
            </span>
            {ctrl.evaluation_method === 'manual_flag' && (
              <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ background: COLORS.purple + '12', color: COLORS.purple }}>
                {s.manual}
              </span>
            )}
            {/* Enterprise plan badge */}
            {ctrl.remediation?.requires_plan_upgrade && ctrl.remediation?.min_plan === 'enterprise' && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#8B5CF615', color: '#8B5CF6', border: '1px solid #8B5CF630' }}
                title={s.enterpriseRequired}
              >
                {IC.crown} {s.enterpriseBadge}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5 truncate" style={{ color: COLORS.textPrimary }}>{biStr(ctrl.title, lang)}</p>
          {/* Show missing permission name inline for insufficient_permissions controls */}
          {ctrl.status === 'insufficient_permissions' && ctrl.evidence?.expected_value && (
            <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.orange }}>
              {IC.lock} {ctrl.evidence.expected_value.replace(/^Requires permission:\s*/i, '')}
            </p>
          )}
        </div>
        {/* Score */}
        <span className="text-sm font-mono font-bold flex-shrink-0" style={{ color: stCol }}>
          {ctrl.score}
        </span>
        {/* Expand arrow */}
        <span className="text-xs transition-transform flex-shrink-0" style={{ color: COLORS.textMuted, transform: expanded ? 'rotate(180deg)' : 'none' }}>{'\u25BC'}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {/* Description */}
          <p className="text-xs pt-3 leading-relaxed" style={{ color: COLORS.textSecondary }}>{biStr(ctrl.description, lang)}</p>

          {/* Insufficient permissions banner */}
          {ctrl.status === 'insufficient_permissions' && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: '#f59e0b08', border: `1px solid ${COLORS.orange}30` }}>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M9 1L17 16H1L9 1Z" stroke={COLORS.orange} strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 7v4M9 13v1" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-bold" style={{ color: COLORS.orange }}>{s.permsBannerTitle}</span>
              </div>
              <p className="text-xs" style={{ color: '#d97706' }}>{s.permsBannerDesc}</p>
              {ctrl.evidence?.expected_value && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: COLORS.orange + '12', border: `1px solid ${COLORS.orange}25` }}>
                  <span className="text-xs font-medium" style={{ color: '#92400e' }}>{s.permsBannerRequired}:</span>
                  <span className="text-xs font-bold font-mono" style={{ color: COLORS.orange }}>
                    {ctrl.evidence.expected_value.replace(/^Requires permission:\s*/i, '')}
                  </span>
                </div>
              )}
              <p className="text-xs" style={{ color: '#92400e' }}>{s.permsBannerHowTo}</p>
              <div className="flex items-center gap-4">
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  style={{ color: COLORS.cyan }}
                >
                  {s.permsBannerLink} {'\u2197'}
                </a>
                <span className="text-xs" style={{ color: '#92400e' }}>{s.permsBannerRerun}</span>
              </div>
            </div>
          )}

          {/* Regulatory Reference */}
          <DetailSection title={s.regulatoryRef} icon={IC.doc}>
            <p className="text-xs font-semibold" style={{ color: COLORS.purple }}>{ctrl.regulatory_reference.framework_name} {IC.dot} {ctrl.regulatory_reference.clause}</p>
            <p className="text-xs mt-1 italic leading-relaxed" style={{ color: COLORS.textSecondary }}>{biStr(ctrl.regulatory_reference.section, lang)}</p>
            <div className="mt-2 p-3 rounded-lg" style={{ background: '#0c0f1a', border: `1px solid ${COLORS.border}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: COLORS.textMuted }}>{s.officialText}:</p>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.textPrimary }}>{biStr(ctrl.regulatory_reference.official_text, lang)}</p>
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.cyan }}>
              {s.applicability}: <span style={{ color: COLORS.textSecondary }}>{biStr(ctrl.regulatory_reference.applicability_note, lang)}</span>
            </p>
          </DetailSection>

          {/* Evidence */}
          {ctrl.evidence && (
          <DetailSection title={s.evidence} icon={IC.eye}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: '#0c0f1a', border: `1px solid ${COLORS.border}` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLORS.textMuted }}>{s.currentValue}</p>
                <p className="text-sm font-mono" style={{ color: ctrl.status === 'pass' ? COLORS.green : ctrl.status === 'fail' ? COLORS.red : COLORS.yellow }}>
                  {ctrl.evidence.current_value}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#0c0f1a', border: `1px solid ${COLORS.border}` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLORS.textMuted }}>{s.expectedValue}</p>
                <p className="text-sm font-mono" style={{ color: COLORS.green }}>{ctrl.evidence.expected_value}</p>
              </div>
            </div>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: COLORS.textSecondary }}>{ctrl.evidence.details}</p>
            {(ctrl.evidence.data_sources || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs" style={{ color: COLORS.textMuted }}>{s.dataSources}:</span>
                {(ctrl.evidence.data_sources || []).map((ds, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 rounded text-xs font-mono" style={{ background: COLORS.cyan + '08', color: COLORS.cyan }}>
                    {ds}
                  </span>
                ))}
              </div>
            )}
          </DetailSection>
          )}

          {/* Remediation */}
          {ctrl.status !== 'pass' && ctrl.status !== 'not_applicable' && ctrl.remediation && (
            <DetailSection title={s.remediation} icon={IC.gear}>
              <p className="text-xs" style={{ color: COLORS.textPrimary }}>{biStr(ctrl.remediation.summary, lang)}</p>
              <p className="text-xs mt-1" style={{ color: COLORS.red }}>
                {s.riskIfIgnored}: <span style={{ color: COLORS.textSecondary }}>{biStr(ctrl.remediation.risk_if_ignored, lang)}</span>
              </p>
              {/* Steps */}
              <div className="space-y-2 mt-3">
                {(ctrl.remediation.steps || []).map((step) => (
                  <div key={step.order} className="flex items-start gap-3 p-2 rounded-lg" style={{ background: '#0c0f1a' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: COLORS.cyan + '15', color: COLORS.cyan }}>
                      {step.order}
                    </span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: COLORS.textPrimary }}>{biStr(step.action, lang)}</p>
                      <p className="text-xs" style={{ color: COLORS.textMuted }}>{biStr(step.where, lang)}</p>
                      <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>{biStr(step.detail, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: COLORS.textMuted }}>
                <span>{s.effort}: <span className="font-semibold" style={{ color: COLORS.cyan }}>{effortLabel(ctrl.remediation.estimated_effort, s)}</span></span>
                {ctrl.remediation.cloudflare_doc_url && (
                  <a href={ctrl.remediation.cloudflare_doc_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: COLORS.cyan }}>
                    {s.cfDocs} {IC.arrow}
                  </a>
                )}
              </div>
              {/* Enterprise plan requirement notice */}
              {ctrl.remediation.requires_plan_upgrade && ctrl.remediation.min_plan === 'enterprise' && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: '#8B5CF608', border: '1px solid #8B5CF620' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#8B5CF6' }}>{IC.crown}</span>
                    <span className="text-xs font-bold" style={{ color: '#8B5CF6' }}>
                      {s.enterpriseRequired}
                    </span>
                  </div>
                </div>
              )}
              {/* Anga AutoFix Button */}
              {showAutoFix && ctrl.remediation.can_be_automated && onAutoFix && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #06b6d410 0%, #8B5CF610 100%)', border: '1px solid #06b6d430' }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span style={{ color: COLORS.cyan }}>{IC.wrench}</span>
                      <div>
                        <span className="text-xs font-bold" style={{ color: COLORS.cyan }}>
                          {s.autoFixAvailable}
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                          {s.autoFixTimeSaved}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAutoFix(); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4 0%, #8B5CF6 100%)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
                      }}
                    >
                      {IC.lightning} {s.autoFixBtn}
                      <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        500 {s.autoFixCredits}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </DetailSection>
          )}

          {/* Cross-references */}
          {(ctrl.cross_references || []).length > 0 && (
            <DetailSection title={s.crossRefs} icon={IC.link}>
              <div className="flex flex-wrap gap-1.5">
                {(ctrl.cross_references || []).map((cr, i) => {
                  const fwInfo = COMPLIANCE_FRAMEWORK_INFO[cr.framework];
                  return (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ background: COLORS.purple + '10', color: COLORS.purple, border: `1px solid ${COLORS.purple}20` }}>
                      {fwInfo?.name || cr.framework} {IC.dot} {cr.clause}
                    </span>
                  );
                })}
              </div>
            </DetailSection>
          )}

          {/* Manual Checklist */}
          {ctrl.evaluation_method === 'manual_flag' && ctrl.manual_checklist && (
            <DetailSection title={s.manualChecklist} icon={IC.eye}>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onChecklist(); }}
                  disabled={checklistLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: ctrl.manual_checklist.verified ? COLORS.green + '15' : COLORS.purple + '15',
                    color: ctrl.manual_checklist.verified ? COLORS.green : COLORS.purple,
                    border: `1px solid ${ctrl.manual_checklist.verified ? COLORS.green : COLORS.purple}30`,
                    opacity: checklistLoading ? 0.5 : 1,
                  }}
                >
                  {checklistLoading ? IC.clock : ctrl.manual_checklist.verified ? IC.check : IC.circle}
                  {ctrl.manual_checklist.verified ? s.markUnverified : s.markVerified}
                </button>
                {ctrl.manual_checklist.verified && ctrl.manual_checklist.verified_at && (
                  <span className="text-xs" style={{ color: COLORS.textMuted }}>
                    {s.verifiedAt}: {fmtDate(ctrl.manual_checklist.verified_at)}
                  </span>
                )}
              </div>
            </DetailSection>
          )}
        </div>
      )}
    </div>
  );
}

// \u2500\u2500\u2500 Detail Section wrapper \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function DetailSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#0a0d16', border: `1px solid ${COLORS.border}` }}>
      <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: COLORS.textMuted }}>
        <span>{icon}</span> {title}
      </p>
      {children}
    </div>
  );
}
